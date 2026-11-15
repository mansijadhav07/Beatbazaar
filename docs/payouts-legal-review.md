# Payout, tax and Route review

## Status

**LEGAL REVIEW REQUIRED.** This document records open product and accounting
decisions. It is not tax, legal, or financial advice. Do not treat the current
checkout, payout hold, or invoice placeholders as launch-approved policy.

## Decisions required from a chartered accountant

Before issuing invoices or enabling live payments, a chartered accountant must
confirm:

- Whether Astrylix or each producer is the supplier for each license sale,
  and which party must issue the customer invoice.
- GST registration, place-of-supply treatment, taxable value, tax collection,
  invoice fields, credit notes, and refund adjustments.
- Whether any TDS or other withholding obligations apply to producer earnings,
  including the applicable classification, thresholds, rates, timing, deposits,
  returns, and producer certificates.
- How Razorpay fees and taxes on those fees are accounted for and allocated
  between Astrylix and producers.
- Required records and reporting for refunds, chargebacks, reversals, and
  producer settlements.
- Any foreign exchange, withholding, or reporting obligations before
  international sales are considered.

No tax rate, TDS rate, GST treatment, platform fee, or invoice policy is set by
this implementation. Checkout tax and invoice fields remain placeholders until
these decisions are reviewed.

## License terms and snapshots

Producers supply terms separately for each enabled license during upload and
select which uploaded files that license includes. Checkout snapshots the
selected terms and version into the order, and the license PDF reproduces that
snapshot. The platform does not generate final license language. A license
without producer-provided terms cannot be purchased. All producer terms and
platform policy text require legal review before launch.

## Razorpay Route implementation notes

- Producer onboarding uses the composite `POST /v2/accounts` API with a bank
  settlement account. The request creates the linked account, Route product
  configuration, and settlement destination atomically. No hosted
  producer-facing onboarding flow was identified in the current Route API
  documentation. The composite API is documented as available for India.
  The current form creates individual accounts only. Confirm the producer
  entity types expected at launch; registered businesses require a separate
  onboarding flow and appropriate provider fields.
- Integration is restricted to `rzp_test_` credentials. Bank settlement
  accounts can be tested with test keys. UPI settlement accounts require live
  keys and are not used here.
- Route payment transfers are created only after a captured INR payment.
  Transfers use an `on_hold` flag and an `on_hold_until` timestamp. Provider
  transfer notes contain the local per-order-item idempotency key; the worker
  checks provider transfers before retrying a create request. The current
  payment-transfer API documentation does not describe an idempotency header
  for transfer creation, so the integration relies on a local creation lease
  and provider lookup by that note. Verify retry behavior with Razorpay before
  live use.
- Transfers created in order requests are documented as INR-only for India.
  International sales are disabled. The implementation uses the payment-
  transfer API instead of putting transfers in the order request, because
  payment capture and fee data are verified before payout records are created.
  The `payoutMode` setting is a configuration seam only; a manual USD payout
  path is not implemented.
- Route documentation says new linked accounts have a 24-hour cooling period
  before transfers can be initiated. The worker defers transfer creation
  through that period. Bank settlements take 2 working days, independently of
  the site refund-window hold.
- Current Route eligibility documentation lists minimum turnover thresholds
  of more than INR 40 lakh domestic or INR 5 lakh export in FY25 or FY26, plus
  payer-payee-transparency requirements. It also notes a December 31, 2025
  compliance deadline. Confirm current account eligibility and approval
  directly with Razorpay before launch. The integration does not establish
  eligibility.
- Route dispute event names documented by Razorpay are
  `payment.dispute.created`, `payment.dispute.won`, `payment.dispute.lost`,
  `payment.dispute.closed`, `payment.dispute.under_review`, and
  `payment.dispute.action_required`.
- Refunds use Razorpay's `reverse_all` option for the current full-order refund
  flow. Partial refunds involving multiple linked accounts require a separate
  per-transfer reversal design and are not implemented.

Documentation reviewed:

- [Route overview](https://razorpay.com/docs/payments/route)
- [Composite linked-account API](https://razorpay.com/docs/api/payments/route/create-linked-account-composite.md)
- [Transfers from payments](https://razorpay.com/docs/api/payments/route/create-transfers-payments.md)
- [Transfers from orders](https://razorpay.com/docs/api/payments/route/create-transfers-orders.md)
- [Route webhooks](https://razorpay.com/docs/webhooks/route)
- [Disputes webhooks](https://razorpay.com/docs/webhooks/disputes)

## Configuration placeholders

- `PLATFORM_FEE_PERCENT` must be explicitly configured. No default business
  rate is provided.
- `REFUND_WINDOW_DAYS` currently defaults to a placeholder of 14 days. The
  owner must approve the actual policy and value.
- Tax fields and invoice generation must remain marked **LEGAL REVIEW
  REQUIRED** until the decisions above are documented and implemented.
- Gateway fees are allocated to paid order items pro rata by item sale amount.
  Any rounding remainder is assigned to the last paid item. This is the
  selected implementation rule and remains subject to accounting review.
