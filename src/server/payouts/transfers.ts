import "server-only";

import crypto from "node:crypto";
import { siteConfig } from "@/config/site";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { OrderModel, type IOrder } from "@/server/db/models/Order";
import { PayoutTransferModel, type IPayoutTransfer } from "@/server/db/models/PayoutTransfer";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import { connectMongoose } from "@/server/db/mongoose";
import { createRouteGateway, type RouteGateway, type RouteTransferResult } from "./route-gateway";

const DAY_MS = 24 * 60 * 60 * 1000;
const ROUTE_ACCOUNT_COOLING_MS = DAY_MS;
const CLAIM_MS = 5 * 60 * 1000;

export interface GatewayFeeAllocation {
  orderItemIdx: number;
  grossAmount: number;
  gatewayFeeAmount: number;
  netAmount: number;
}

export function calculateHoldReleaseAt(now: Date, refundWindowDays: number): Date {
  if (!Number.isSafeInteger(refundWindowDays) || refundWindowDays < 1) {
    throw new Error("REFUND_WINDOW_DAYS must be a positive whole number.");
  }
  return new Date(now.getTime() + refundWindowDays * DAY_MS);
}

export function routeAccountCoolingEndsAt(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + ROUTE_ACCOUNT_COOLING_MS);
}

export function isRouteAccountCooling(
  submittedAt: Date | null | undefined,
  now: Date
): boolean {
  return Boolean(submittedAt && now < routeAccountCoolingEndsAt(submittedAt));
}

export function allocateGatewayFee(
  items: ReadonlyArray<{ amount: number }>,
  totalGatewayFee: number
): GatewayFeeAllocation[] {
  if (!Number.isSafeInteger(totalGatewayFee) || totalGatewayFee < 0) {
    throw new Error("Gateway fee must be a non-negative integer amount.");
  }

  const payableItems = items
    .map((item, orderItemIdx) => ({ orderItemIdx, grossAmount: item.amount }))
    .filter((item) => item.grossAmount > 0);
  const totalGross = payableItems.reduce((sum, item) => sum + item.grossAmount, 0);
  if (totalGross === 0) return [];

  let allocatedFee = 0;
  return payableItems.map((item, index) => {
    const gatewayFeeAmount =
      index === payableItems.length - 1
        ? totalGatewayFee - allocatedFee
        : Math.floor((totalGatewayFee * item.grossAmount) / totalGross);
    allocatedFee += gatewayFeeAmount;
    return {
      ...item,
      gatewayFeeAmount,
      netAmount: item.grossAmount - gatewayFeeAmount,
    };
  });
}

export function payoutIdempotencyKey(orderId: string, orderItemIdx: number): string {
  return crypto
    .createHash("sha256")
    .update(`order-item:${orderId}:${orderItemIdx}`)
    .digest("hex");
}

export async function ensureProviderTransfer(
  gateway: RouteGateway,
  paymentId: string,
  input: {
    linkedAccountId: string;
    amount: number;
    holdReleaseAt: Date;
    idempotencyKey: string;
  }
): Promise<RouteTransferResult> {
  const existing = await gateway.findTransfer(paymentId, input.idempotencyKey);
  if (existing) return existing;
  return gateway.createTransfer(paymentId, input);
}

function providerTransferStatus(transfer: RouteTransferResult) {
  if (transfer.status === "failed") return "failed" as const;
  if (transfer.settlementStatus === "settled") return "paid_out" as const;
  if (transfer.settlementStatus === "on_hold") return "pending_hold" as const;
  return "awaiting_settlement" as const;
}

async function ensurePayoutRecord(
  order: IOrder,
  orderItemIdx: number,
  gatewayFeeAmount: number | undefined,
  netAmount: number | undefined,
  holdReleaseAt: Date,
  status: "awaiting_kyc" | "awaiting_account_cooling" | "awaiting_fee_data"
): Promise<IPayoutTransfer> {
  const item = order.items[orderItemIdx];
  const idempotencyKey = payoutIdempotencyKey(order._id.toString(), orderItemIdx);
  const fields = {
    producerId: item.producerId.toString(),
    orderId: order._id.toString(),
    orderItemIdx,
    trackId: item.trackId.toString(),
    trackTitle: item.title,
    licenseTier: item.licenseTier,
    paymentId: order.paymentRef!,
    idempotencyKey,
    currency: "INR" as const,
    grossAmount: item.pricePaid.amount,
    platformFeeAmount: item.platformFeeAmount,
    gatewayFeeAmount,
    netAmount,
    holdReleaseAt,
    status,
  };

  try {
    const record = await PayoutTransferModel.findOneAndUpdate(
      { orderId: fields.orderId, orderItemIdx },
      { $setOnInsert: fields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (
      record.providerTransferId === undefined &&
      gatewayFeeAmount !== undefined &&
      record.gatewayFeeAmount === undefined
    ) {
      await PayoutTransferModel.updateOne(
        { _id: record._id, providerTransferId: { $exists: false } },
        {
          $set: {
            gatewayFeeAmount,
            netAmount,
            status,
          },
        }
      );
      return (
        (await PayoutTransferModel.findById(record._id)) || record
      );
    }
    return record;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      const existing = await PayoutTransferModel.findOne({
        orderId: fields.orderId,
        orderItemIdx,
      });
      if (existing) return existing;
    }
    throw error;
  }
}

async function transferRecord(
  record: IPayoutTransfer,
  linkedAccountId: string,
  gateway: RouteGateway
): Promise<void> {
  if (!record.paymentId || !record.netAmount || record.netAmount < 1) {
    await PayoutTransferModel.updateOne(
      { _id: record._id },
      { $set: { status: "awaiting_fee_data" } }
    );
    return;
  }

  const now = new Date();
  const claim = await PayoutTransferModel.findOneAndUpdate(
    {
      _id: record._id,
      providerTransferId: { $exists: false },
      $or: [
        {
          status: {
            $in: [
              "awaiting_kyc",
              "awaiting_account_cooling",
              "awaiting_fee_data",
              "failed",
            ],
          },
        },
        { status: "creating", creationLeaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "creating",
        linkedAccountId,
        creationLeaseUntil: new Date(now.getTime() + CLAIM_MS),
      },
    },
    { new: true }
  );
  if (!claim) return;
  if (!claim.netAmount || claim.netAmount < 1) {
    await PayoutTransferModel.updateOne(
      { _id: claim._id, status: "creating" },
      {
        $set: { status: "awaiting_fee_data" },
        $unset: { creationLeaseUntil: 1 },
      }
    );
    return;
  }

  try {
    const transfer = await ensureProviderTransfer(gateway, claim.paymentId, {
      linkedAccountId,
      amount: claim.netAmount,
      holdReleaseAt: claim.holdReleaseAt,
      idempotencyKey: claim.idempotencyKey,
    });
    const status = providerTransferStatus(transfer);
    await PayoutTransferModel.updateOne(
      { _id: claim._id, status: "creating" },
      {
        $set: {
          providerTransferId: transfer.id,
          providerTransferStatus: transfer.status,
          providerSettlementStatus: transfer.settlementStatus,
          settlementId: transfer.settlementId,
          status,
        },
        $unset: { creationLeaseUntil: 1 },
      }
    );
    await AuditLogModel.create({
      actorId: "system",
      actorRole: "system",
      action: "producer_transfer_created",
      targetCollection: "payout_transfers",
      targetId: claim._id.toString(),
      before: { status: claim.status },
      after: {
        status,
        providerTransferId: transfer.id,
        netAmount: claim.netAmount,
        currency: claim.currency,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    await PayoutTransferModel.updateOne(
      { _id: claim._id, status: "creating" },
      { $set: { status: "failed" }, $unset: { creationLeaseUntil: 1 } }
    );
    throw error;
  }
}

export async function ensureOrderPayoutTransfers(
  orderId: string,
  gateway: RouteGateway = createRouteGateway(),
  now = new Date()
): Promise<void> {
  if (!siteConfig.payoutsEnabled) return;
  await connectMongoose();
  const order = await OrderModel.findById(orderId);
  if (!order || order.status !== "paid") {
    throw new Error("Payout transfers require a paid order.");
  }
  if (order.currency !== "INR" || !order.paymentRef) {
    throw new Error("Route payouts require a captured INR payment.");
  }

  const paidItems = order.items.map((item) => item.pricePaid.amount);
  const hasPaidItems = paidItems.some((amount) => amount > 0);
  if (!hasPaidItems) return;

  let gatewayFee = order.gatewayFeeAmount;
  if (gatewayFee === undefined) {
    gatewayFee = await gateway.fetchPaymentFee(order.paymentRef);
    if (gatewayFee !== undefined) {
      order.gatewayFeeAmount = gatewayFee;
      await order.save();
    }
  }

  const feeAllocations =
    gatewayFee === undefined
      ? []
      : allocateGatewayFee(paidItems.map((amount) => ({ amount })), gatewayFee);
  const feeByItem = new Map(
    feeAllocations.map((allocation) => [allocation.orderItemIdx, allocation])
  );
  const holdReleaseAt = calculateHoldReleaseAt(
    now,
    siteConfig.refundWindowDays
  );

  for (let idx = 0; idx < order.items.length; idx++) {
    const item = order.items[idx];
    if (item.pricePaid.amount === 0) continue;

    const feeAllocation = feeByItem.get(idx);
    const profile = await ProducerProfileModel.findOne({
      userId: item.producerId.toString(),
    });
    const accountActive = Boolean(
      profile?.payoutAccountRef && profile.kycStatus === "active"
    );
    const accountCooling =
      accountActive && isRouteAccountCooling(profile?.payoutSubmittedAt, now);
    const initialStatus =
      gatewayFee === undefined || !feeAllocation
        ? "awaiting_fee_data"
        : "awaiting_kyc";
    const netAmount = feeAllocation
      ? feeAllocation.netAmount - item.platformFeeAmount
      : undefined;
    const record = await ensurePayoutRecord(
      order,
      idx,
      feeAllocation?.gatewayFeeAmount,
      netAmount !== undefined && netAmount > 0 ? netAmount : undefined,
      holdReleaseAt,
      initialStatus === "awaiting_fee_data" || (netAmount !== undefined && netAmount < 1)
        ? "awaiting_fee_data"
        : accountCooling
          ? "awaiting_account_cooling"
          : "awaiting_kyc"
    );

    if (!accountActive || !profile?.payoutAccountRef) {
      continue;
    }
    if (accountCooling) {
      await PayoutTransferModel.updateOne(
        { _id: record._id, providerTransferId: { $exists: false } },
        { $set: { status: "awaiting_account_cooling" } }
      );
      continue;
    }
    if (record.netAmount !== undefined && record.netAmount < 1) {
      await PayoutTransferModel.updateOne(
        { _id: record._id },
        { $set: { status: "awaiting_fee_data" } }
      );
      continue;
    }
    await transferRecord(record, profile.payoutAccountRef, gateway);
  }
}

export async function processAwaitingKycTransfers(
  producerId: string,
  gateway: RouteGateway = createRouteGateway(),
  now = new Date()
): Promise<void> {
  if (!siteConfig.payoutsEnabled) return;
  await connectMongoose();
  const profile = await ProducerProfileModel.findOne({ userId: producerId });
  if (!profile?.payoutAccountRef || profile.kycStatus !== "active") return;

  const awaiting = await PayoutTransferModel.find({
    producerId,
    status: { $in: ["awaiting_kyc", "awaiting_account_cooling"] },
    providerTransferId: { $exists: false },
  }).limit(200);
  if (isRouteAccountCooling(profile.payoutSubmittedAt, now)) {
    await PayoutTransferModel.updateMany(
      {
        producerId,
        status: "awaiting_kyc",
        providerTransferId: { $exists: false },
      },
      { $set: { status: "awaiting_account_cooling" } }
    );
    return;
  }
  await resumeAwaitingKycRecords(
    profile.kycStatus,
    profile.payoutAccountRef,
    awaiting,
    (record, linkedAccountId) => transferRecord(record, linkedAccountId, gateway)
  );
}

export async function processCoolingPayoutTransfers(
  gateway: RouteGateway = createRouteGateway(),
  now = new Date()
): Promise<void> {
  if (!siteConfig.payoutsEnabled) return;
  await connectMongoose();
  const producerIds = await PayoutTransferModel.distinct("producerId", {
    status: { $in: ["awaiting_kyc", "awaiting_account_cooling"] },
    providerTransferId: { $exists: false },
  });
  for (const producerId of producerIds) {
    await processAwaitingKycTransfers(producerId, gateway, now);
  }
}

export async function resumeAwaitingKycRecords<T>(
  kycStatus: string,
  linkedAccountId: string | null | undefined,
  records: ReadonlyArray<T>,
  createTransfer: (record: T, linkedAccountId: string) => Promise<void>
): Promise<number> {
  if (kycStatus !== "active" || !linkedAccountId) return 0;
  for (const record of records) {
    await createTransfer(record, linkedAccountId);
  }
  return records.length;
}

export function shouldHoldTransferForDispute(
  settlementStatus: string | undefined
): boolean {
  return settlementStatus !== "settled";
}

export async function processFeePendingPayouts(
  gateway: RouteGateway = createRouteGateway()
): Promise<void> {
  await connectMongoose();
  const orderIds = await PayoutTransferModel.distinct("orderId", {
    status: "awaiting_fee_data",
  });
  for (const orderId of orderIds) {
    await ensureOrderPayoutTransfers(orderId, gateway);
  }
}

export async function updateTransferFromWebhook(input: {
  transferId: string;
  transferStatus?: string;
  settlementStatus?: string;
  settlementId?: string;
}): Promise<void> {
  await connectMongoose();
  const record = await PayoutTransferModel.findOne({
    providerTransferId: input.transferId,
  });
  if (!record) return;

  const result: RouteTransferResult = {
    id: input.transferId,
    status: input.transferStatus || record.providerTransferStatus || "pending",
    settlementStatus:
      input.settlementStatus || record.providerSettlementStatus,
    settlementId: input.settlementId || record.settlementId,
  };
  const status =
    record.status === "disputed" ? "disputed" : providerTransferStatus(result);

  await PayoutTransferModel.updateOne(
    { _id: record._id },
    {
      $set: {
        providerTransferStatus: result.status,
        providerSettlementStatus: result.settlementStatus,
        settlementId: result.settlementId,
        status,
      },
    }
  );
}

export async function markPaymentTransfersDisputed(input: {
  paymentId: string;
  disputeId: string;
  disputeStatus: string;
  eventId: string;
  gateway: RouteGateway;
}): Promise<void> {
  await connectMongoose();
  const records = await PayoutTransferModel.find({ paymentId: input.paymentId });
  for (const record of records) {
    if (
      record.providerTransferId &&
      shouldHoldTransferForDispute(record.providerSettlementStatus)
    ) {
      await input.gateway.holdTransfer(record.providerTransferId);
    }

    await PayoutTransferModel.updateOne(
      { _id: record._id },
      {
        $set: {
          status: "disputed",
          disputeId: input.disputeId,
          disputeStatus: input.disputeStatus,
        },
      }
    );
    await EarningsLedgerModel.updateOne(
      { eventKey: `${input.eventId}:${record._id}` },
      {
        $setOnInsert: {
          eventKey: `${input.eventId}:${record._id}`,
          producerId: record.producerId,
          orderId: record.orderId,
          orderItemIdx: record.orderItemIdx,
          entryType: "dispute",
          trackId: record.trackId,
          trackTitle: record.trackTitle,
          licenseTier: record.licenseTier,
          grossAmount: 0,
          platformFee: 0,
          netAmount: 0,
          currency: "INR",
          status: "pending",
        },
      },
      { upsert: true }
    );
  }

  await AuditLogModel.updateOne(
    {
      action: "payment_dispute_updated",
      targetCollection: "payments",
      targetId: input.paymentId,
      "after.eventId": input.eventId,
    },
    {
      $setOnInsert: {
        actorId: "system",
        actorRole: "system",
        action: "payment_dispute_updated",
        targetCollection: "payments",
        targetId: input.paymentId,
        before: {},
        after: {
          disputeId: input.disputeId,
          disputeStatus: input.disputeStatus,
          eventId: input.eventId,
        },
        timestamp: new Date(),
      },
    },
    { upsert: true }
  );
}
