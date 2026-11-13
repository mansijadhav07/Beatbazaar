import "server-only";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { DownloadRecordModel } from "@/server/db/models/Download";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { siteConfig } from "@/config/site";
import { getPaymentProvider } from "./index";

export interface RefundResult {
  success: boolean;
  orderId: string;
  refundedAmount: number;
}

/**
 * Service function to process an order refund.
 * Revokes downloads, creates reversing ledger entries in the append-only earnings ledger,
 * updates order status to refunded, and records an audit log entry.
 */
export async function refundOrder(
  orderId: string,
  adminUserId: string,
  reason: string = "Admin initiated refund"
): Promise<RefundResult> {
  await connectMongoose();

  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.status !== "paid") {
    throw new Error(`Cannot refund order in "${order.status}" status.`);
  }

  // 1. Call payment gateway refund if amount > 0 and paymentRef is set
  if (order.paymentRef && order.totalAmount > 0) {
    await getPaymentProvider().refund(order.paymentRef, order.totalAmount);
  }

  // 2. Mark order as refunded
  order.status = "refunded";
  await order.save();

  // 3. Revoke all active downloads for this order
  await DownloadRecordModel.updateMany(
    { orderId: order._id },
    { $set: { revoked: true } }
  );

  // 4. Create reversing entries in the append-only EarningsLedger
  for (let idx = 0; idx < order.items.length; idx++) {
    const item = order.items[idx];
    const gross = item.pricePaid.amount;
    const platformFee = Math.floor((gross * siteConfig.platformFeePercent) / 100);
    const net = gross - platformFee;

    await EarningsLedgerModel.findOneAndUpdate(
      {
        orderId: order._id.toString(),
        orderItemIdx: idx,
        entryType: "reversal",
      },
      {
        producerId: item.producerId.toString(),
        orderId: order._id.toString(),
        orderItemIdx: idx,
        entryType: "reversal",
        trackId: item.trackId.toString(),
        trackTitle: item.title,
        licenseTier: item.licenseTier,
        grossAmount: -gross,
        platformFee: -platformFee,
        netAmount: -net,
        currency: item.pricePaid.currency,
        status: "voided",
      },
      { upsert: true, new: true }
    );
  }

  // 5. Write audit log entry
  await AuditLogModel.create({
    actorId: adminUserId,
    actorRole: "admin",
    action: "order_refunded",
    targetCollection: "orders",
    targetId: orderId,
    before: { status: "paid" },
    after: { status: "refunded", reason },
    timestamp: new Date(),
  });

  return {
    success: true,
    orderId,
    refundedAmount: order.totalAmount,
  };
}

