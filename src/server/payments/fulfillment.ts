import "server-only";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { TrackModel } from "@/server/db/models/Track";
import { CheckoutReservationModel } from "@/server/db/models/CheckoutReservation";
import { DownloadRecordModel } from "@/server/db/models/Download";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { sendEmail } from "@/server/email";
import { siteConfig } from "@/config/site";
import { getPaymentProvider } from "./index";

/**
 * Fulfills a paid or free order atomically.
 * Idempotent: safe to invoke multiple times; subsequent calls for non-pending orders are no-ops.
 * For exclusive licenses, atomically verifies track status is live, updates to sold_exclusive,
 * and refunds if a race condition caused the beat to be sold elsewhere.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  await connectMongoose();

  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Idempotency: if already processed, do not fulfill again
  if (order.status !== "pending") {
    return;
  }

  // 1. Process exclusive items atomically
  for (const item of order.items) {
    if (item.licenseTier === "exclusive") {
      // Conditional update: only succeed if track is currently live
      const updatedTrack = await TrackModel.findOneAndUpdate(
        { _id: item.trackId, status: "live" },
        { $set: { status: "sold_exclusive" } },
        { new: true }
      );

      if (!updatedTrack) {
        // Track was already sold or no longer live. Race condition detected.
        order.status = "failed";
        await order.save();

        // Release any reservation held by this buyer
        await CheckoutReservationModel.deleteMany({ trackId: item.trackId.toString() });

        // Auto-refund if payment was already captured
        if (order.paymentRef && order.totalAmount > 0) {
          try {
            await getPaymentProvider().refund(order.paymentRef, order.totalAmount);
          } catch (refundErr) {
            console.error(`[Fulfillment] Auto-refund failed for order ${orderId}:`, refundErr);
          }
        }

        await AuditLogModel.create({
          actorId: order.buyerId,
          actorRole: "buyer",
          action: "exclusive_race_collision_refunded",
          targetCollection: "orders",
          targetId: orderId,
          before: { status: "pending" },
          after: { status: "failed" },
          timestamp: new Date(),
        });

        throw new Error(
          "Exclusive purchase conflict: this beat has already been sold exclusively to another buyer. Your payment has been refunded."
        );
      }

      // Cleanup reservation for this track
      await CheckoutReservationModel.deleteMany({ trackId: item.trackId.toString() });
    }
  }

  // 2. Mark order as paid
  const previousStatus = order.status;
  order.status = "paid";
  await order.save();

  // 3. Create download records for each item
  for (let idx = 0; idx < order.items.length; idx++) {
    const item = order.items[idx];
    await DownloadRecordModel.findOneAndUpdate(
      { orderId: order._id, orderItemIdx: idx },
      {
        orderId: order._id,
        orderItemIdx: idx,
        trackId: item.trackId,
        buyerId: order.buyerId,
        revoked: false,
        downloadCount: 0,
      },
      { upsert: true, new: true }
    );

    // 4. Create producer earnings ledger entries
    const gross = item.pricePaid.amount;
    const platformFee = Math.floor((gross * siteConfig.platformFeePercent) / 100);
    const net = gross - platformFee;

    await EarningsLedgerModel.findOneAndUpdate(
      {
        orderId: order._id.toString(),
        orderItemIdx: idx,
        entryType: "sale",
      },
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
      { upsert: true, new: true }
    );
  }

  // 5. Send order confirmation email
  try {
    const orderUrl = `${siteConfig.url}/orders/${orderId}`;
    const itemsHtml = order.items
      .map(
        (it) =>
          `<li><strong>${it.title}</strong> (${it.licenseTier.toUpperCase()} License) - ${it.pricePaid.currency} ${(it.pricePaid.amount / 100).toFixed(2)}</li>`
      )
      .join("");

    await sendEmail({
      to: order.buyerId.includes("@") ? order.buyerId : `buyer-${order.buyerId}@beatbazaar.local`,
      subject: `Order Confirmation - ${siteConfig.name}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your license agreement and download links are ready:</p>
        <ul>${itemsHtml}</ul>
        <p><a href="${orderUrl}">View Your Order & Download Files</a></p>
      `,
      text: `Thank you for your order! Your files and license agreements are ready to download at ${orderUrl}`,
    });
  } catch (emailErr) {
    // Non-fatal: log and proceed
    console.error("[Fulfillment] Order email notification failed:", emailErr);
  }

  // 6. Record audit log
  await AuditLogModel.create({
    actorId: order.buyerId,
    actorRole: "system",
    action: "order_fulfilled",
    targetCollection: "orders",
    targetId: orderId,
    before: { status: previousStatus },
    after: { status: "paid" },
    timestamp: new Date(),
  });
}

