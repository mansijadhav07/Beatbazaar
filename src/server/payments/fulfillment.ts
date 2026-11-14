import "server-only";
import mongoose from "mongoose";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel, type IOrder } from "@/server/db/models/Order";
import { TrackModel } from "@/server/db/models/Track";
import { CheckoutReservationModel } from "@/server/db/models/CheckoutReservation";
import { DownloadRecordModel } from "@/server/db/models/Download";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { sendEmail } from "@/server/email";
import { siteConfig } from "@/config/site";
import { getPaymentProvider } from "./index";
import { getPlatformFeePercent } from "./fees";
import { revalidatePublicTrack } from "@/server/catalog/revalidation";
import { getAppUrl } from "@/lib/app-url";

class ExclusivePurchaseConflict extends Error {
  constructor(readonly trackId: string) {
    super("Exclusive purchase conflict.");
    this.name = "ExclusivePurchaseConflict";
  }
}

/**
 * Fulfills a verified paid or free order in one MongoDB transaction.
 * The conditional track update and order state change commit together.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  await connectMongoose();
  const session = await mongoose.startSession();
  let fulfilledOrder: IOrder | null = null;

  try {
    fulfilledOrder = await session.withTransaction(async () => {
      const order = await OrderModel.findById(orderId).session(session);
      if (!order) throw new Error(`Order not found: ${orderId}`);
      if (order.status !== "pending") return null;
      const previousStatus = order.status;

      for (const item of order.items) {
        if (item.licenseTier !== "exclusive") continue;

        const updatedTrack = await TrackModel.findOneAndUpdate(
          { _id: item.trackId, status: "live" },
          { $set: { status: "sold_exclusive" } },
          { new: true, session }
        );

        if (!updatedTrack) {
          throw new ExclusivePurchaseConflict(item.trackId.toString());
        }

        await CheckoutReservationModel.deleteMany(
          { trackId: item.trackId.toString() },
          { session }
        );
      }

      order.status = "paid";
      await order.save({ session });

      for (let idx = 0; idx < order.items.length; idx++) {
        const item = order.items[idx];
        await DownloadRecordModel.updateOne(
          { orderId: order._id, orderItemIdx: idx },
          {
            $setOnInsert: {
              orderId: order._id,
              orderItemIdx: idx,
              trackId: item.trackId,
              buyerId: order.buyerId,
              revoked: false,
              downloadCount: 0,
            },
          },
          { upsert: true, session }
        );

        const gross = item.pricePaid.amount;
        const platformFee =
          item.platformFeeAmount ??
          Math.floor((gross * getPlatformFeePercent()) / 100);
        const net = gross - platformFee;

        await EarningsLedgerModel.create(
          [
            {
              producerId: item.producerId.toString(),
              orderId: order._id.toString(),
              orderItemIdx: idx,
              entryType: "sale",
              trackId: item.trackId.toString(),
              trackTitle: item.title,
              licenseTier: item.licenseTier,
              grossAmount: gross,
              platformFee,
              netAmount: net,
              currency: item.pricePaid.currency,
              status: "pending",
            },
          ],
          { session }
        );
      }

      await AuditLogModel.create(
        [
          {
            actorId: order.buyerId,
            actorRole: "system",
            action: "order_fulfilled",
            targetCollection: "orders",
            targetId: orderId,
            before: { status: previousStatus },
            after: { status: "paid" },
            timestamp: new Date(),
          },
        ],
        { session }
      );
      return order;
    });
  } catch (error) {
    if (!(error instanceof ExclusivePurchaseConflict)) throw error;
    const orderForRefund = await OrderModel.findById(orderId);

    let refundSucceeded = false;
    if (orderForRefund?.paymentRef && orderForRefund.totalAmount > 0) {
      await getPaymentProvider().refund(
        orderForRefund.paymentRef,
        orderForRefund.totalAmount,
        { idempotencyKey: `exclusive-collision:${orderId}` }
      );
      refundSucceeded = true;
    }

    if (refundSucceeded || orderForRefund?.totalAmount === 0) {
      await OrderModel.updateOne(
        { _id: orderId, status: "pending" },
        { $set: { status: "failed" } }
      );
      await CheckoutReservationModel.deleteMany({
        trackId: error.trackId,
      });
    }

    await AuditLogModel.create({
      actorId: orderForRefund?.buyerId || "system",
      actorRole: "system",
      action: refundSucceeded
        ? "exclusive_race_collision_refunded"
        : "exclusive_race_collision_refund_pending",
      targetCollection: "orders",
      targetId: orderId,
      before: { status: "pending" },
      after: {
        status: refundSucceeded || orderForRefund?.totalAmount === 0
          ? "failed"
          : "pending",
        refundSucceeded,
      },
      timestamp: new Date(),
    });

    if (!refundSucceeded && orderForRefund?.totalAmount) {
      throw new Error(
        "Exclusive purchase conflict detected. The order was not fulfilled and the payment refund needs review."
      );
    }
    if (orderForRefund?.totalAmount === 0) {
      throw new Error(
        "Exclusive purchase conflict detected. The order was not fulfilled."
      );
    }
    throw new Error(
      "Exclusive purchase conflict detected. The payment refund has been requested."
    );
  } finally {
    await session.endSession();
  }

  if (!fulfilledOrder) return;

  for (const trackId of new Set(
    fulfilledOrder.items
      .filter((item) => item.licenseTier === "exclusive")
      .map((item) => item.trackId.toString())
  )) {
    revalidatePublicTrack(trackId);
  }

  const orderUrl = getAppUrl(`/orders/${orderId}`);
  const itemsHtml = fulfilledOrder.items
    .map(
      (item) =>
        `<li><strong>${item.title}</strong> (${item.licenseTier.toUpperCase()} License) - ${item.pricePaid.currency} ${(item.pricePaid.amount / 100).toFixed(2)}</li>`
    )
    .join("");

  try {
    await sendEmail({
      to: fulfilledOrder.buyerEmail,
      subject: `Order Confirmation - ${siteConfig.name}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your license terms and download links are ready:</p>
        <ul>${itemsHtml}</ul>
        <p><a href="${orderUrl}" rel="noopener noreferrer">View your order and downloads</a></p>
      `,
      text: `Your files and license terms are ready at ${orderUrl}`,
    });
  } catch (emailError) {
    console.error(
      "[Fulfillment] Order email notification failed.",
      emailError instanceof Error ? emailError.name : "UnknownError"
    );
  }
}
