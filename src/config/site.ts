export const siteConfig = {
  name: "Beatbazaar",
  description:
    "The marketplace for authentic Indian and global music production beats, licenses, and stems.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://beatbazaar.com",
  ogImage: "https://beatbazaar.com/og.jpg",
  publicR2Domain:
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "https://cdn.beatbazaar.com",

  // Play count display: only show if track has >= this many plays
  minPlayCountThreshold: 50,

  // Location-based landing page minimum content threshold
  minProducersForLocationPage: 5,

  // -------------------------------------------------------------------------
  // Phase 4: payments and fees
  // -------------------------------------------------------------------------

  /**
   * Platform fee charged on each sale, as a percentage (integer).
   * Example: 20 means 20% of the sale price.
   * This is a placeholder. Do not display this to producers in the UI yet.
   * Confirm the final rate before launch.
   */
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT || "20", 10),

  /**
   * When true, USD price options are shown and Razorpay orders are created in USD.
   * Requires "International Payments" to be enabled on the Razorpay dashboard.
   * When false, only INR is offered.
   */
  internationalPaymentsEnabled:
    process.env.NEXT_PUBLIC_INTERNATIONAL_PAYMENTS_ENABLED === "true",

  /**
   * Stored exchange rate used to derive USD price when a producer has not set one.
   * Rounding rule: USD = round(INR / rate, 2), then converted to cents (integer).
   * This rate is snapshotted onto the order at checkout and must be updated regularly.
   */
  usdToInrRate: parseFloat(process.env.USD_TO_INR_RATE || "84.00"),

  /**
   * Minimum cart amount in INR minor units (paise) to allow checkout.
   * Prevents sub-paisa orders that payment gateways may reject.
   */
  minCheckoutAmountPaise: 100, // 1.00 INR

  /**
   * Download link expiry in seconds (issued per click from the order page).
   */
  downloadLinkExpirySeconds: 300, // 5 minutes

  /**
   * Exclusive checkout reservation TTL in seconds (~10 minutes).
   * Released on payment failure or expiry.
   */
  exclusiveReservationTtlSeconds: 600,
};
