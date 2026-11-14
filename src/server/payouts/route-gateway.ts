import "server-only";

import crypto from "node:crypto";
import Razorpay from "razorpay";
import { siteConfig } from "@/config/site";

export interface LinkedAccountInput {
  producerId: string;
  email: string;
  phone: string;
  legalBusinessName: string;
  pan?: string;
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
}

export interface LinkedAccountResult {
  id: string;
  accountStatus: string;
  activationStatus?: string;
  requiredActions: string[];
}

export interface RouteTransferResult {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  settlementStatus?: string;
  settlementId?: string;
}

export interface SettlementReconEntry {
  transferId: string;
  settlementId: string;
  settled: boolean;
}

export interface RouteTransferInput {
  linkedAccountId: string;
  amount: number;
  holdReleaseAt: Date;
  idempotencyKey: string;
}

export interface RouteGateway {
  createLinkedAccount(input: LinkedAccountInput): Promise<LinkedAccountResult>;
  fetchPaymentFee(paymentId: string): Promise<number | undefined>;
  findTransfer(paymentId: string, idempotencyKey: string): Promise<RouteTransferResult | null>;
  createTransfer(
    paymentId: string,
    input: RouteTransferInput
  ): Promise<RouteTransferResult>;
  holdTransfer(transferId: string): Promise<void>;
  reverseTransfer(
    transferId: string,
    amount: number
  ): Promise<string>;
  listTransfers(from: Date, to: Date): Promise<RouteTransferResult[]>;
  listSettlements(from: Date, to: Date): Promise<SettlementReconEntry[]>;
}

function assertTestCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

  if (!keyId.startsWith("rzp_test_") || !keySecret) {
    throw new Error("Razorpay Route is restricted to configured test credentials.");
  }

  return { keyId, keySecret };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toTransferResult(value: unknown): RouteTransferResult {
  const item = asRecord(value);
  if (!item || typeof item.id !== "string" || typeof item.status !== "string") {
    throw new Error("Razorpay returned an invalid transfer response.");
  }
  return {
    id: item.id,
    status: item.status,
    amount:
      typeof item.amount === "number" && Number.isSafeInteger(item.amount)
        ? item.amount
        : undefined,
    currency: typeof item.currency === "string" ? item.currency : undefined,
    settlementStatus:
      typeof item.settlement_status === "string"
        ? item.settlement_status
        : undefined,
    settlementId:
      typeof item.recipient_settlement_id === "string"
        ? item.recipient_settlement_id
        : undefined,
  };
}

function parseLinkedAccount(value: unknown): LinkedAccountResult {
  const account = asRecord(value);
  if (!account || typeof account.id !== "string") {
    throw new Error("Razorpay returned an invalid linked-account response.");
  }
  const productConfig = asRecord(account.product_config);
  const activationStatus =
    typeof productConfig?.activation_status === "string"
      ? productConfig.activation_status
      : undefined;
  const requiredActions: string[] = [];

  if (account.status === "created" || activationStatus === "under_review") {
    requiredActions.push("provider_review");
  }
  if (activationStatus === "needs_clarification") {
    requiredActions.push("provider_action_required");
  }

  return {
    id: account.id,
    accountStatus:
      typeof account.status === "string" ? account.status : "created",
    activationStatus,
    requiredActions,
  };
}

function safeIdempotencyKey(namespace: string, value: string): string {
  return crypto
    .createHash("sha256")
    .update(`${namespace}:${value}`)
    .digest("hex");
}

export function createRouteGateway(fetcher: typeof fetch = fetch): RouteGateway {
  if (siteConfig.payoutMode !== "razorpay_route") {
    throw new Error("Manual payout mode is configured but not implemented.");
  }
  const { keyId, keySecret } = assertTestCredentials();
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  async function fetchApi(path: string, body: Record<string, unknown>, idempotencyKey: string) {
    const response = await fetcher(`https://api.razorpay.com${path}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Razorpay request failed with status ${response.status}.`);
    }
    return response.json() as Promise<unknown>;
  }

  return {
    async createLinkedAccount(input) {
      const account = await fetchApi(
        "/v2/accounts",
        {
          type: "route",
          tnc_accepted: true,
          reference_id: safeIdempotencyKey("producer", input.producerId).slice(0, 40),
          legal_business_name: input.legalBusinessName,
          business_type: "individual",
          email: input.email,
          phone: input.phone,
          ...(input.pan ? { legal_info: { pan: input.pan } } : {}),
          settlement_accounts: [
            {
              method: "bank_account",
              bank_account: {
                account_number: input.accountNumber,
                beneficiary_name: input.beneficiaryName,
                code_type: "ifsc",
                code: input.ifsc,
                currency: "INR",
                is_default: true,
              },
            },
          ],
        },
        safeIdempotencyKey("route-onboarding", input.producerId)
      );
      return parseLinkedAccount(account);
    },

    async fetchPaymentFee(paymentId) {
      const payment = await client.payments.fetch(paymentId);
      return Number.isSafeInteger(payment.fee) && payment.fee >= 0
        ? payment.fee
        : undefined;
    },

    async findTransfer(paymentId, idempotencyKey) {
      const transfers = await client.payments.fetchTransfer(paymentId);
      const match = transfers.items.find(
        (transfer) => transfer.notes?.payout_idempotency_key === idempotencyKey
      );
      return match ? toTransferResult(match) : null;
    },

    async createTransfer(paymentId, input) {
      const result = await client.payments.transfer(paymentId, {
        transfers: [
          {
            account: input.linkedAccountId,
            amount: input.amount,
            currency: "INR",
            on_hold: true,
            on_hold_until: Math.floor(input.holdReleaseAt.getTime() / 1000),
            notes: { payout_idempotency_key: input.idempotencyKey },
          },
        ],
      });
      const transfer = result.items[0];
      if (!transfer) throw new Error("Razorpay returned no transfer.");
      return toTransferResult(transfer);
    },

    async holdTransfer(transferId) {
      await client.transfers.edit(transferId, { on_hold: true });
    },

    async reverseTransfer(transferId, amount) {
      const reversal = await client.transfers.reverse(transferId, { amount });
      if (!reversal.id) throw new Error("Razorpay returned no reversal ID.");
      return reversal.id;
    },

    async listTransfers(from, to) {
      const transfers: RouteTransferResult[] = [];
      for (let skip = 0; ; skip += 100) {
        const result = await client.transfers.all({
          from: Math.floor(from.getTime() / 1000),
          to: Math.floor(to.getTime() / 1000),
          count: 100,
          skip,
        });
        transfers.push(...result.items.map(toTransferResult));
        if (result.items.length < 100) return transfers;
      }
    },

    async listSettlements(from, to) {
      const reconEntries: SettlementReconEntry[] = [];
      const day = new Date(from);
      day.setUTCHours(0, 0, 0, 0);
      const finalDay = new Date(to.getTime() - 1);
      finalDay.setUTCHours(0, 0, 0, 0);

      while (day <= finalDay) {
        for (let skip = 0; ; skip += 1000) {
          const response = await client.settlements.reports({
            year: day.getUTCFullYear(),
            month: day.getUTCMonth() + 1,
            day: day.getUTCDate(),
            count: 1000,
            skip,
          });
          const collection = asRecord(response);
          const items = Array.isArray(collection?.items) ? collection.items : [];
          for (const rawItem of items) {
            const item = asRecord(rawItem);
            if (
              item?.type === "transfer" &&
              typeof item.entity_id === "string" &&
              typeof item.settlement_id === "string"
            ) {
              reconEntries.push({
                transferId: item.entity_id,
                settlementId: item.settlement_id,
                settled: item.settled === true,
              });
            }
          }
          if (items.length < 1000) break;
        }
        day.setUTCDate(day.getUTCDate() + 1);
      }
      return reconEntries;
    },
  };
}
