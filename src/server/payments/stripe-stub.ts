// StripeProvider stub. Requires a non-Indian entity or Stripe Atlas.
// Indian businesses cannot directly settle USD via Stripe without a foreign subsidiary.
// All methods throw until implemented.
// LEGAL REVIEW REQUIRED before enabling Stripe for Indian business.

import type {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutResult,
  WebhookEvent,
} from "./types";

export class StripeProvider implements PaymentProvider {
  async createCheckout(_input: CreateCheckoutInput): Promise<CheckoutResult> {
    throw new Error(
      "StripeProvider not implemented. See stripe-stub.ts for requirements."
    );
  }

  verifyWebhook(_rawBody: string, _signature: string): WebhookEvent | null {
    throw new Error(
      "StripeProvider not implemented. See stripe-stub.ts for requirements."
    );
  }

  async refund(_paymentId: string, _amountMinorUnits: number): Promise<void> {
    throw new Error(
      "StripeProvider not implemented. See stripe-stub.ts for requirements."
    );
  }
}
