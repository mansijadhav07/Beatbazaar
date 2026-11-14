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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function entityFrom(
  payload: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const container = asRecord(payload[key]);
  return asRecord(container?.entity) || {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : undefined;
}

const webhookTypes = new Set<WebhookEventType>([
  "payment.captured",
  "order.paid",
  "payment.failed",
  "refund.processed",
  "product.route.under_review",
  "product.route.needs_clarification",
  "product.route.activated",
  "account.activated",
  "account.under_review",
  "account.needs_clarification",
  "account.updated",
  "transfer.processed",
  "transfer.failed",
  "settlement.processed",
  "payment.dispute.created",
  "payment.dispute.won",
  "payment.dispute.lost",
  "payment.dispute.closed",
  "payment.dispute.under_review",
  "payment.dispute.action_required",
]);

export class RazorpayProvider implements PaymentProvider {
  private readonly client: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key";
    if (!keyId.startsWith("rzp_test_")) {
      throw new Error("Razorpay payments are restricted to test credentials.");
    }
    this.client = new Razorpay({
      key_id: keyId,
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

  verifyWebhook(
    rawBody: string,
    signature: string,
    providerEventId?: string
  ): WebhookEvent | null {
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

      const body = asRecord(JSON.parse(rawBody) as unknown);
      if (!body) return null;

      const eventName = stringValue(body.event) || "";
      const type = webhookTypes.has(eventName as WebhookEventType)
        ? (eventName as WebhookEventType)
        : "unknown";
      const payload = asRecord(body.payload) || {};
      const paymentEntity = entityFrom(payload, "payment");
      const orderEntity = entityFrom(payload, "order");
      const accountEntity = entityFrom(payload, "account");
      const productEntity = entityFrom(payload, "product");
      const transferEntity = entityFrom(payload, "transfer");
      const disputeEntity = entityFrom(payload, "dispute");
      const settlementEntity = entityFrom(payload, "settlement");
      const paymentNotes = asRecord(paymentEntity.notes) || {};
      const orderNotes = asRecord(orderEntity.notes) || {};
      const accountProduct = asRecord(accountEntity.product_config) || {};
      const productConfig = asRecord(productEntity.product_config) || {};
      const activeConfiguration =
        asRecord(accountProduct.active_configuration) ||
        asRecord(productConfig.active_configuration) ||
        {};
      const settlementAccounts = Array.isArray(activeConfiguration.settlement_accounts)
        ? activeConfiguration.settlement_accounts
        : [];
      const firstSettlement = asRecord(settlementAccounts[0]) || {};
      const disputePayment = stringValue(disputeEntity.payment_id);
      const paymentId =
        stringValue(paymentEntity.id) ||
        (disputePayment ? disputePayment : undefined);
      const rawCurrency =
        stringValue(paymentEntity.currency) ||
        stringValue(orderEntity.currency) ||
        stringValue(transferEntity.currency) ||
        "";
      const currency: SupportedCurrency | undefined =
        rawCurrency === "INR" || rawCurrency === "USD"
          ? rawCurrency
          : undefined;
      const accountStatus =
        stringValue(accountEntity.status) ||
        (type === "account.activated" ? "activated" : undefined);
      const activationStatus =
        stringValue(productEntity.activation_status) ||
        stringValue(productConfig.activation_status) ||
        (type === "product.route.activated" ? "activated" : undefined);
      const verificationStatus = stringValue(firstSettlement.verification_status);
      const requiredActions: string[] = [];

      if (
        type === "product.route.needs_clarification" ||
        type === "account.needs_clarification"
      ) {
        requiredActions.push("provider_action_required");
      }
      if (verificationStatus === "pending") {
        requiredActions.push("settlement_account_verification");
      }
      if (
        accountStatus === "created" ||
        activationStatus === "under_review" ||
        type === "product.route.under_review" ||
        type === "account.under_review"
      ) {
        requiredActions.push("provider_review");
      }

      const paymentStatus = stringValue(paymentEntity.status);
      const paymentCaptured =
        typeof paymentEntity.captured === "boolean"
          ? paymentEntity.captured
          : paymentStatus === "captured" || type === "order.paid";
      const amountMinorUnits =
        numberValue(paymentEntity.amount) ?? numberValue(orderEntity.amount);

      return {
        type,
        providerEventId:
          providerEventId || crypto.createHash("sha256").update(rawBody).digest("hex"),
        internalOrderId:
          stringValue(orderNotes.internal_order_id) ||
          stringValue(paymentNotes.internal_order_id),
        providerPaymentId: paymentId,
        providerOrderId:
          stringValue(orderEntity.id) || stringValue(paymentEntity.order_id),
        amountMinorUnits,
        currency,
        paymentCaptured,
        gatewayFeeMinorUnits: numberValue(paymentEntity.fee),
        linkedAccountId:
          stringValue(accountEntity.id) ||
          stringValue(productEntity.account_id),
        linkedAccountStatus:
          accountStatus ||
          (type === "product.route.activated" ? "activated" : undefined),
        routeActivationStatus:
          activationStatus ||
          (type === "product.route.needs_clarification"
            ? "needs_clarification"
            : type === "product.route.under_review"
              ? "under_review"
              : undefined),
        settlementVerificationStatus: verificationStatus,
        requiredActions,
        transferId: stringValue(transferEntity.id),
        transferStatus: stringValue(transferEntity.status),
        transferSettlementStatus: stringValue(transferEntity.settlement_status),
        settlementId: stringValue(settlementEntity.id),
        disputeId: stringValue(disputeEntity.id),
        disputeStatus:
          stringValue(disputeEntity.status) ||
          (type.startsWith("payment.dispute.")
            ? type.slice("payment.dispute.".length)
            : undefined),
      };
    } catch {
      return null;
    }
  }

  async refund(
    paymentId: string,
    amountMinorUnits: number,
    options?: { reverseAll?: boolean; idempotencyKey?: string }
  ): Promise<void> {
    const idempotencyKey = options?.idempotencyKey;
    if (idempotencyKey) {
      const refunds = await this.client.payments.fetchMultipleRefund(paymentId, {
        count: 100,
      });
      const existing = refunds.items.find(
        (refund) => refund.notes?.internal_refund_id === idempotencyKey
      );
      if (existing) {
        if (existing.amount !== amountMinorUnits || existing.status === "failed") {
          throw new Error("The recorded refund requires manual review.");
        }
        return;
      }
    }

    const refundRequest = {
      amount: amountMinorUnits,
      reverse_all: options?.reverseAll,
      ...(idempotencyKey
        ? { notes: { internal_refund_id: idempotencyKey } }
        : {}),
    };
    await this.client.payments.refund(paymentId, {
      ...refundRequest,
    });
  }
}
