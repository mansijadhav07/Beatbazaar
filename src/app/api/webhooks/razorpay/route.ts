import { NextResponse, type NextRequest } from "next/server";
import { connectMongoose } from "@/server/db/mongoose";
import { PaymentEventModel } from "@/server/db/models/PaymentEvent";
import { OrderModel } from "@/server/db/models/Order";
import { getPaymentProvider } from "@/server/payments";
import { fulfillOrder } from "@/server/payments/fulfillment";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    const provider = getPaymentProvider();
    const event = provider.verifyWebhook(rawBody, signature);

    if (!event) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    await connectMongoose();

    // Idempotency: verify this provider event ID was not previously processed
    const existingEvent = await PaymentEventModel.findOne({
      provider: "razorpay",
      eventId: event.providerEventId,
    });

    if (existingEvent) {
      return NextResponse.json(
        { status: "already_processed", eventId: event.providerEventId },
        { status: 200 }
      );
    }

    const payload = (event.raw as any)?.payload || {};
    const internalOrderId =
      payload.order?.entity?.notes?.internal_order_id ||
      payload.payment?.entity?.notes?.internal_order_id ||
      null;

    // Record the payment event for idempotency and audit logs
    await PaymentEventModel.create({
      provider: "razorpay",
      eventId: event.providerEventId,
      eventType: event.type,
      orderId: internalOrderId || undefined,
      processedAt: new Date(),
      raw: event.raw,
    });

    if (event.type === "payment.captured" || event.type === "order.paid") {
      let targetOrder = null;

      if (internalOrderId) {
        targetOrder = await OrderModel.findById(internalOrderId);
      }

      if (!targetOrder && event.providerPaymentId) {
        targetOrder = await OrderModel.findOne({ paymentRef: event.providerPaymentId });
      }

      if (!targetOrder && event.providerOrderId) {
        // Query by Razorpay order ID if stored
        targetOrder = await OrderModel.findOne({
          status: "pending",
          _id: internalOrderId,
        });
      }

      if (targetOrder) {
        if (event.providerPaymentId && !targetOrder.paymentRef) {
          targetOrder.paymentRef = event.providerPaymentId;
          await targetOrder.save();
        }

        if (targetOrder.status === "pending") {
          await fulfillOrder(targetOrder._id.toString());
        }
      } else {
        console.warn(
          `[Razorpay Webhook] Order matching payload not found: internalOrderId=${internalOrderId}, paymentId=${event.providerPaymentId}`
        );
      }
    } else if (event.type === "payment.failed") {
      if (internalOrderId) {
        await OrderModel.updateOne(
          { _id: internalOrderId, status: "pending" },
          { $set: { status: "failed" } }
        );
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: unknown) {
    console.error("[Razorpay Webhook] Error processing event:", err);
    // Return 200 to acknowledge webhook receipt and prevent infinite retry storms
    return NextResponse.json({ status: "received_with_error" }, { status: 200 });
  }
}
