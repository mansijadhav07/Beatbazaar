import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectMongoose } from "@/server/db/mongoose";
import { PaymentEventModel } from "@/server/db/models/PaymentEvent";
import { OrderModel } from "@/server/db/models/Order";
import { getPaymentProvider } from "@/server/payments";
import { fulfillOrder } from "@/server/payments/fulfillment";
import { getCaptureMismatchReason } from "@/server/payments/payment-integrity";
import {
  ensureOrderPayoutTransfers,
  markPaymentTransfersDisputed,
  updateTransferFromWebhook,
} from "@/server/payouts/transfers";
import { applyLinkedAccountWebhook } from "@/server/payouts/webhooks";
import { createRouteGateway } from "@/server/payouts/route-gateway";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const headerEventId = request.headers.get("x-razorpay-event-id") || undefined;
  const eventId =
    headerEventId || createHash("sha256").update(rawBody).digest("hex");
  const event = getPaymentProvider().verifyWebhook(rawBody, signature, eventId);

  if (!event) {
    return NextResponse.json(
      { error: "Invalid webhook signature or payload." },
      { status: 400 }
    );
  }

  try {
    await connectMongoose();

    const alreadyProcessed = await PaymentEventModel.findOne({
      provider: "razorpay",
      eventId: event.providerEventId,
      status: "processed",
    }).lean();

    if (alreadyProcessed) {
      return NextResponse.json({ status: "already_processed" });
    }

    if (event.type === "payment.captured" || event.type === "order.paid") {
      const targetOrder =
        (event.internalOrderId
          ? await OrderModel.findById(event.internalOrderId)
          : null) ||
        (event.providerOrderId
          ? await OrderModel.findOne({ providerOrderId: event.providerOrderId })
          : null) ||
        (event.providerPaymentId
          ? await OrderModel.findOne({ paymentRef: event.providerPaymentId })
          : null);

      if (!targetOrder) {
        throw new Error("No matching order for captured payment.");
      }
      const captureMismatch = getCaptureMismatchReason(event, targetOrder);
      if (captureMismatch) throw new Error(captureMismatch);

      if (event.providerPaymentId) {
        targetOrder.paymentRef = event.providerPaymentId;
      }
      if (event.gatewayFeeMinorUnits !== undefined) {
        targetOrder.gatewayFeeAmount = event.gatewayFeeMinorUnits;
      }
      await targetOrder.save();

      if (targetOrder.status === "pending") {
        await fulfillOrder(targetOrder._id.toString());
      }
      if (targetOrder.status === "paid" || targetOrder.status === "pending") {
        await ensureOrderPayoutTransfers(
          targetOrder._id.toString(),
          createRouteGateway()
        );
      }
    } else if (
      event.type.startsWith("product.route.") ||
      event.type.startsWith("account.")
    ) {
      await applyLinkedAccountWebhook(event);
    } else if (event.type === "transfer.processed" || event.type === "transfer.failed") {
      if (event.transferId) {
        await updateTransferFromWebhook({
          transferId: event.transferId,
          transferStatus: event.transferStatus,
          settlementStatus: event.transferSettlementStatus,
          settlementId: event.settlementId,
        });
      }
    } else if (event.type === "settlement.processed") {
      if (event.transferId) {
        await updateTransferFromWebhook({
          transferId: event.transferId,
          transferStatus: event.transferStatus,
          settlementStatus: "settled",
          settlementId: event.settlementId,
        });
      }
    } else if (event.type.startsWith("payment.dispute.")) {
      if (event.providerPaymentId && event.disputeId) {
        await markPaymentTransfersDisputed({
          paymentId: event.providerPaymentId,
          disputeId: event.disputeId,
          disputeStatus: event.disputeStatus || event.type,
          eventId: event.providerEventId,
          gateway: createRouteGateway(),
        });
      }
    }

    await PaymentEventModel.findOneAndUpdate(
      { provider: "razorpay", eventId: event.providerEventId },
      {
        $set: {
          provider: "razorpay",
          eventId: event.providerEventId,
          eventType: event.type,
          orderId: event.internalOrderId,
          status: "processed",
          processedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(
      "[Razorpay Webhook] Processing failed.",
      error instanceof Error ? error.name : "UnknownError"
    );
    return NextResponse.json(
      { error: "Webhook processing failed. Razorpay may retry this event." },
      { status: 500 }
    );
  }
}
