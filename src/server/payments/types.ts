export type SupportedCurrency = "INR" | "USD";

export interface CreateCheckoutInput {
  internalOrderId: string;
  currency: SupportedCurrency;
  amountMinorUnits: number; // paise for INR, cents for USD
  receiptId: string;
  returnUrl: string;
}

export interface CheckoutResult {
  providerOrderId: string;
  checkoutKeyId: string;
}

export type WebhookEventType =
  | "payment.captured"
  | "order.paid"
  | "payment.failed"
  | "refund.processed"
  | "unknown";

export interface WebhookEvent {
  type: WebhookEventType;
  providerEventId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountMinorUnits?: number;
  currency?: SupportedCurrency;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, signature: string): WebhookEvent | null;
  refund(paymentId: string, amountMinorUnits: number): Promise<void>;
}
