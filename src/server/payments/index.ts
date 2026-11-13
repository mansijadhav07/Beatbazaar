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

let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!_provider) _provider = new RazorpayProvider();
  return _provider;
}

// For testing only
export function _setPaymentProvider(p: PaymentProvider): void {
  _provider = p;
}
