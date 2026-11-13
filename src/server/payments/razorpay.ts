import crypto from "crypto";
import Razorpay from "razorpay";
import type {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutResult,
  WebhookEvent,
  WebhookEventType,
  SupportedCurrency,
} from "./types";

export class RazorpayProvider implements PaymentProvider {
  private readonly client: Razorpay;

  constructor() {
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_placeholder_secret",
    });
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const order = await this.client.orders.create({
      amount: input.amountMinorUnits,
      currency: input.currency,
      receipt: input.receiptId,
      notes: {
        internal_order_id: input.internalOrderId,
      },
    });

    return {
      providerOrderId: order.id,
      checkoutKeyId: process.env.RAZORPAY_KEY_ID || "",
    };
  }

  verifyWebhook(rawBody: string, signature: string): WebhookEvent | null {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    try {
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSig, "hex");

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return null;
      }

      const body = JSON.parse(rawBody) as Record<string, unknown>;
      const event = (body.event as string) || "";

      // Map Razorpay event names to our internal types
      let type: WebhookEventType;
      if (event === "payment.captured") {
        type = "payment.captured";
      } else if (event === "order.paid") {
        type = "order.paid";
      } else if (event === "payment.failed") {
        type = "payment.failed";
      } else if (event === "refund.processed") {
        type = "refund.processed";
      } else {
        type = "unknown";
      }

      const payload = (body.payload as Record<string, any>) || {};
      const paymentEntity = payload.payment?.entity || {};
      const orderEntity = payload.order?.entity || {};

      let providerEventId: string;
      if (event.startsWith("order.")) {
        providerEventId = (orderEntity.id as string) || "";
      } else {
        providerEventId = (paymentEntity.id as string) || "";
      }

      const providerPaymentId = paymentEntity.id as string | undefined;
      const providerOrderId =
        (orderEntity.id as string | undefined) ||
        (paymentEntity.order_id as string | undefined);

      const amountMinorUnits =
        typeof paymentEntity.amount === "number"
          ? paymentEntity.amount
          : typeof orderEntity.amount === "number"
            ? orderEntity.amount
            : undefined;

      const rawCurrency: string =
        paymentEntity.currency || orderEntity.currency || "";
      const currency: SupportedCurrency | undefined =
        rawCurrency === "INR" || rawCurrency === "USD"
          ? rawCurrency
          : undefined;

      return {
        type,
        providerEventId,
        providerPaymentId,
        providerOrderId,
        amountMinorUnits,
        currency,
        raw: body as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  }

  async refund(paymentId: string, amountMinorUnits: number): Promise<void> {
    await this.client.payments.refund(paymentId, {
      amount: amountMinorUnits,
    });
  }
}
