import "server-only";

import mongoose from "mongoose";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { DownloadRecordModel } from "@/server/db/models/Download";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";
import { getPaymentProvider } from "./index";
import { createRouteGateway } from "@/server/payouts/route-gateway";
import {
  buildRefundProviderOptions,
  buildRefundReversalEntry,
  shouldHoldTransferBeforeRefund,
} from "@/server/payouts/refund-policy";

export interface RefundResult {
  success: boolean;
  orderId: string;
  refundedAmount: number;
}

export async function refundOrder(
  orderId: string,
  adminUserId: string,
  reason = "Admin initiated refund"
): Promise<RefundResult> {
  await connectMongoose();
  const order = await OrderModel.findById(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);
  if (order.status !== "paid") {
    throw new Error(`Cannot refund order in "${order.status}" status.`);
  }
  if (order.totalAmount > 0 && !order.paymentRef) {
    throw new Error("Cannot refund a paid order without a payment reference.");
  }

  const transfers = await PayoutTransferModel.find({
    orderId: order._id.toString(),
  });
  const routeTransfers = transfers.filter(
    (transfer) => Boolean(transfer.providerTransferId)
  );
  const routeGateway =
    order.currency === "INR" && routeTransfers.length > 0
      ? createRouteGateway()
      : null;

  if (routeGateway) {
    for (const transfer of routeTransfers) {
      if (shouldHoldTransferBeforeRefund(transfer.providerSettlementStatus)) {
        await routeGateway.holdTransfer(transfer.providerTransferId!);
      }
    }
  }

  if (order.paymentRef && order.totalAmount > 0) {
    await getPaymentProvider().refund(
      order.paymentRef,
      order.totalAmount,
      buildRefundProviderOptions(orderId, Boolean(routeGateway))
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const currentOrder = await OrderModel.findOne({
        _id: order._id,
        status: "paid",
      }).session(session);
      if (!currentOrder) {
        throw new Error("Order refund has already been processed.");
      }

      currentOrder.status = "refunded";
      await currentOrder.save({ session });

      await DownloadRecordModel.updateMany(
        { orderId: currentOrder._id },
        { $set: { revoked: true } },
        { session }
      );

      for (let idx = 0; idx < currentOrder.items.length; idx++) {
        const item = currentOrder.items[idx];
        const gross = item.pricePaid.amount;
        const transfer = transfers.find(
          (entry) => entry.orderItemIdx === idx
        );
        const saleEntry = await EarningsLedgerModel.findOne({
          orderId: currentOrder._id.toString(),
          orderItemIdx: idx,
          entryType: "sale",
        })
          .session(session)
          .lean();
        const platformFee = item.platformFeeAmount;
        const gatewayFee = transfer?.gatewayFeeAmount || 0;
        const net =
          transfer?.netAmount ??
          (saleEntry?.netAmount ?? gross - platformFee);

        await EarningsLedgerModel.updateOne(
          {
            orderId: currentOrder._id.toString(),
            orderItemIdx: idx,
            entryType: "reversal",
          },
          {
            $setOnInsert: buildRefundReversalEntry({
              producerId: item.producerId.toString(),
              orderId: currentOrder._id.toString(),
              orderItemIdx: idx,
              entryType: "reversal",
              trackId: item.trackId.toString(),
              trackTitle: item.title,
              licenseTier: item.licenseTier,
              grossAmount: -gross,
              platformFee: -platformFee,
              netAmount: -net,
              gatewayFee: -gatewayFee,
              currency: item.pricePaid.currency,
              status: "voided",
            }),
          },
          { upsert: true, session }
        );
      }

      await PayoutTransferModel.updateMany(
        { orderId: currentOrder._id.toString() },
        { $set: { status: "reversed" } },
        { session }
      );

      await AuditLogModel.create(
        [
          {
            actorId: adminUserId,
            actorRole: "admin",
            action: "order_refunded",
            targetCollection: "orders",
            targetId: orderId,
            before: { status: "paid" },
            after: {
              status: "refunded",
              reason,
              providerReversedTransfers: routeTransfers.length,
            },
            timestamp: new Date(),
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  return {
    success: true,
    orderId,
    refundedAmount: order.totalAmount,
  };
}
