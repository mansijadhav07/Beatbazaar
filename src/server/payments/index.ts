export { RazorpayProvider } from "./razorpay";
export { StripeProvider } from "./stripe-stub";
export type {
  PaymentProvider,
  CreateCheckoutInput,
  CheckoutResult,
  WebhookEvent,
  WebhookEventType,
  SupportedCurrency,
} from "./types";

import type { PaymentProvider } from "./types";
import { RazorpayProvider } from "./razorpay";
import type { CreateCheckoutInput, CheckoutResult } from "./types";

let _provider: PaymentProvider | null = null;

class PlaywrightPaymentProvider extends RazorpayProvider {
  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    return {
      providerOrderId: `order_test_${input.internalOrderId}`,
      checkoutKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    };
  }

  async refund(): Promise<void> {}
}

export function getPaymentProvider(): PaymentProvider {
  if (!_provider) {
    const playwrightMockEnabled =
      process.env.NODE_ENV !== "production" &&
      process.env.PLAYWRIGHT_TEST_AUTH_ENABLED === "true" &&
      process.env.PLAYWRIGHT_TEST_MOCK_PAYMENTS === "true";
    _provider = playwrightMockEnabled
      ? new PlaywrightPaymentProvider()
      : new RazorpayProvider();
  }
  return _provider;
}

// For testing only
export function _setPaymentProvider(p: PaymentProvider): void {
  _provider = p;
}
