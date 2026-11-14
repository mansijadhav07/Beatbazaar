import { describe, expect, it, vi } from "vitest";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import type { RouteGateway, RouteTransferResult } from "./route-gateway";
import {
  buildSafePayoutStatus,
  parseOnboardingInput,
  safePayoutErrorName,
} from "./onboarding";
import {
  allocateGatewayFee,
  calculateHoldReleaseAt,
  ensureProviderTransfer,
  isRouteAccountCooling,
  resumeAwaitingKycRecords,
  routeAccountCoolingEndsAt,
  shouldHoldTransferForDispute,
} from "./transfers";
import {
  buildRefundProviderOptions,
  buildRefundReversalEntry,
  shouldHoldTransferBeforeRefund,
} from "./refund-policy";
import { resolveLinkedAccountStatus } from "./webhooks";
import { detectReconciliationMismatches } from "./reconciliation";

describe("producer payout calculations", () => {
  it("allocates captured gateway fees proportionally and assigns the remainder", () => {
    const allocations = allocateGatewayFee(
      [{ amount: 0 }, { amount: 101 }, { amount: 199 }],
      11
    );

    expect(allocations).toEqual([
      {
        orderItemIdx: 1,
        grossAmount: 101,
        gatewayFeeAmount: 3,
        netAmount: 98,
      },
      {
        orderItemIdx: 2,
        grossAmount: 199,
        gatewayFeeAmount: 8,
        netAmount: 191,
      },
    ]);
    expect(
      allocations.reduce((sum, allocation) => sum + allocation.gatewayFeeAmount, 0)
    ).toBe(11);
  });

  it("calculates a hold release at the configured number of full days", () => {
    const start = new Date("2026-03-01T10:00:00.000Z");
    expect(calculateHoldReleaseAt(start, 14).toISOString()).toBe(
      "2026-03-15T10:00:00.000Z"
    );
    expect(() => calculateHoldReleaseAt(start, 0)).toThrow(
      /positive whole number/
    );
  });

  it("waits 24 hours after linked-account submission before creating transfers", () => {
    const submittedAt = new Date("2026-03-01T10:00:00.000Z");
    const coolingEndsAt = routeAccountCoolingEndsAt(submittedAt);

    expect(coolingEndsAt.toISOString()).toBe("2026-03-02T10:00:00.000Z");
    expect(isRouteAccountCooling(submittedAt, new Date("2026-03-02T09:59:59.000Z"))).toBe(true);
    expect(isRouteAccountCooling(submittedAt, coolingEndsAt)).toBe(false);
    expect(isRouteAccountCooling(undefined, new Date("2026-03-01T10:00:00.000Z"))).toBe(false);
  });

  it("does not create another provider transfer when the idempotency note already exists", async () => {
    const transfer: RouteTransferResult = {
      id: "trf_existing",
      status: "created",
      settlementStatus: "on_hold",
    };
    const createTransfer = vi.fn(async () => transfer);
    const gateway: RouteGateway = {
      createLinkedAccount: vi.fn(),
      fetchPaymentFee: vi.fn(),
      findTransfer: vi.fn(async () => transfer),
      createTransfer,
      holdTransfer: vi.fn(),
      reverseTransfer: vi.fn(),
      listTransfers: vi.fn(),
      listSettlements: vi.fn(),
    };

    await ensureProviderTransfer(gateway, "pay_test", {
      linkedAccountId: "acc_test",
      amount: 100,
      holdReleaseAt: new Date("2026-03-15T10:00:00.000Z"),
      idempotencyKey: "local-key",
    });

    expect(gateway.findTransfer).toHaveBeenCalledOnce();
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it("resumes awaiting-KYC records only after the account becomes active", async () => {
    const createTransfer = vi.fn(async () => undefined);
    const records = [{ orderId: "order-test" }];

    expect(
      await resumeAwaitingKycRecords("in_review", "acc_test", records, createTransfer)
    ).toBe(0);
    expect(createTransfer).not.toHaveBeenCalled();

    expect(
      await resumeAwaitingKycRecords("active", "acc_test", records, createTransfer)
    ).toBe(1);
    expect(createTransfer).toHaveBeenCalledWith(records[0], "acc_test");
  });

  it("marks pending transfers for hold on disputes but never alters a released settlement", () => {
    expect(shouldHoldTransferForDispute("on_hold")).toBe(true);
    expect(shouldHoldTransferForDispute("pending")).toBe(true);
    expect(shouldHoldTransferForDispute("settled")).toBe(false);
  });
});

describe("KYC data minimization", () => {
  it("keeps only linked-account status fields and excludes sensitive onboarding values", () => {
    const secrets = {
      pan: "ABCDE1234F",
      aadhaar: "123412341234",
      accountNumber: "1234567890123456",
      ifsc: "ABCD0123456",
    };
    const safeStatus = buildSafePayoutStatus(
      {
        id: "acc_test",
        accountStatus: "created",
        activationStatus: "under_review",
        requiredActions: ["provider_review"],
      },
      new Date("2026-03-01T10:00:00.000Z")
    );

    expect(Object.keys(safeStatus).sort()).toEqual(
      [
        "activatedAt",
        "linkedAccountId",
        "requiredActions",
        "status",
        "statusUpdatedAt",
        "submittedAt",
      ].sort()
    );
    const serialized = JSON.stringify(safeStatus);
    for (const secret of Object.values(secrets)) {
      expect(serialized).not.toContain(secret);
    }
    expect(safePayoutErrorName(new Error(Object.values(secrets).join(" ")))).toBe(
      "Error"
    );
    expect(parseOnboardingInput({
      legalBusinessName: "Example Producer",
      phone: "+919876543210",
      pan: secrets.pan,
      beneficiaryName: "Example Producer",
      accountNumber: secrets.accountNumber,
      ifsc: secrets.ifsc,
      acceptedProviderTerms: true,
    })).not.toHaveProperty("aadhaar");
    expect(() =>
      parseOnboardingInput({
        legalBusinessName: "Example Producer",
        phone: "+919876543210",
        accountNumber: secrets.accountNumber,
        ifsc: secrets.ifsc,
        acceptedProviderTerms: true,
        aadhaar: secrets.aadhaar,
      })
    ).toThrow();
  });
});

describe("payout account activation", () => {
  const event = {
    type: "product.route.activated" as const,
    providerEventId: "event-activated",
    linkedAccountId: "acc_test",
    routeActivationStatus: "activated",
    requiredActions: [],
  };

  it("moves an account from review to active only after Route activation", () => {
    expect(resolveLinkedAccountStatus("in_review", event)).toEqual({
      status: "active",
      requiredActions: [],
    });
  });

  it("shows a clear more-information state when settlement verification is pending", () => {
    expect(
      resolveLinkedAccountStatus("in_review", {
        ...event,
        requiredActions: ["settlement_account_verification"],
      })
    ).toEqual({
      status: "needs_more_information",
      requiredActions: ["settlement_account_verification"],
    });
  });
});

describe("refund and append-only ledger rules", () => {
  it("holds an unreleased transfer before refund and requests provider reversals", () => {
    expect(shouldHoldTransferBeforeRefund("on_hold")).toBe(true);
    expect(shouldHoldTransferBeforeRefund("settled")).toBe(false);
    expect(buildRefundProviderOptions("order-1", true)).toEqual({
      reverseAll: true,
      idempotencyKey: "admin-order-refund:order-1",
    });
    expect(buildRefundProviderOptions("order-2", false).reverseAll).toBe(false);
  });

  it("builds a reversing entry as an insert-only ledger document", () => {
    const entry = buildRefundReversalEntry({
      producerId: "producer-1",
      orderId: "order-1",
      orderItemIdx: 0,
      entryType: "reversal",
      trackId: "track-1",
      trackTitle: "Test beat",
      licenseTier: "non_exclusive",
      grossAmount: -100,
      platformFee: -10,
      netAmount: -80,
      gatewayFee: -10,
      currency: "INR",
      status: "voided",
    });

    expect(entry.grossAmount).toBe(-100);
    expect(entry.entryType).toBe("reversal");
    const indexes = EarningsLedgerModel.schema.indexes();
    expect(
      indexes.some(
        ([keys, options]) =>
          keys.orderId === 1 &&
          keys.orderItemIdx === 1 &&
          keys.entryType === 1 &&
          options?.unique === true
      )
    ).toBe(true);
    expect(EarningsLedgerModel.schema.path("updatedAt")).toBeUndefined();
  });
});

describe("payout reconciliation", () => {
  it("detects amount, missing settlement, and unmatched provider transfer mismatches", () => {
    const mismatches = detectReconciliationMismatches(
      [
        {
          id: "local-1",
          providerTransferId: "trf-1",
          netAmount: 100,
          status: "paid_out",
          settlementId: "set-1",
        },
      ],
      [
        {
          id: "trf-1",
          status: "processed",
          amount: 99,
          settlementStatus: "settled",
          settlementId: "set-1",
        },
        { id: "trf-unmatched", status: "created", amount: 50 },
      ],
      []
    );

    expect(mismatches.map((mismatch) => mismatch.kind)).toEqual(
      expect.arrayContaining([
        "transfer_status_mismatch",
        "settlement_missing",
        "local_transfer_missing",
      ])
    );
    expect(mismatches.length).toBeGreaterThanOrEqual(3);
  });
});
