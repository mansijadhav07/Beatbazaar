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
  | "product.route.under_review"
  | "product.route.needs_clarification"
  | "product.route.activated"
  | "account.activated"
  | "account.under_review"
  | "account.needs_clarification"
  | "account.updated"
  | "transfer.processed"
  | "transfer.failed"
  | "settlement.processed"
  | "payment.dispute.created"
  | "payment.dispute.won"
  | "payment.dispute.lost"
  | "payment.dispute.closed"
  | "payment.dispute.under_review"
  | "payment.dispute.action_required"
  | "unknown";

export interface WebhookEvent {
  type: WebhookEventType;
  providerEventId: string;
  internalOrderId?: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountMinorUnits?: number;
  currency?: SupportedCurrency;
  paymentCaptured?: boolean;
  gatewayFeeMinorUnits?: number;
  linkedAccountId?: string;
  linkedAccountStatus?: string;
  routeActivationStatus?: string;
  settlementVerificationStatus?: string;
  requiredActions: string[];
  transferId?: string;
  transferStatus?: string;
  transferSettlementStatus?: string;
  settlementId?: string;
  disputeId?: string;
  disputeStatus?: string;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(
    rawBody: string,
    signature: string,
    providerEventId?: string
  ): WebhookEvent | null;
  refund(
    paymentId: string,
    amountMinorUnits: number,
    options?: { reverseAll?: boolean; idempotencyKey?: string }
  ): Promise<void>;
}
