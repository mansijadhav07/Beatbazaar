import type { IOrder } from "@/server/db/models/Order";
import type { WebhookEvent } from "./types";

export function getCaptureMismatchReason(
  event: WebhookEvent,
  order: Pick<IOrder, "_id" | "providerOrderId" | "totalAmount" | "currency">
): string | null {
  if (event.type === "payment.captured" && event.paymentCaptured !== true) {
    return "Payment is not captured.";
  }
  if (!event.providerPaymentId) {
    return "Captured payment ID is missing.";
  }
  if (
    event.internalOrderId &&
    event.internalOrderId !== order._id.toString()
  ) {
    return "Internal order ID does not match.";
  }
  if (
    !event.providerOrderId ||
    (order.providerOrderId && event.providerOrderId !== order.providerOrderId)
  ) {
    return "Provider order ID does not match.";
  }
  if (
    event.amountMinorUnits !== order.totalAmount ||
    event.currency !== order.currency
  ) {
    return "Captured payment amount or currency does not match.";
  }
  return null;
}
