import { RESERVED_PRODUCER_USERNAMES } from "@/lib/producer-username";

function readPayoutMode(): "razorpay_route" | "manual" {
  const value = process.env.PAYOUT_MODE || "razorpay_route";
  if (value === "razorpay_route" || value === "manual") return value;
  throw new Error("PAYOUT_MODE must be razorpay_route or manual.");
}

function readSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return new URL(configuredUrl).toString().replace(/\/$/, "");
}

function readSupportEmail(): string | null {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  if (!supportEmail) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    throw new Error("NEXT_PUBLIC_SUPPORT_EMAIL must be a valid email address.");
  }
  return supportEmail;
}

export function readPayoutsEnabled(value = process.env.PAYOUTS_ENABLED): boolean {
  return value === "true";
}

const payoutModeValue = readPayoutMode();

export const siteConfig = {
  name: "Astrylix",
  description:
    "Original beats, licenses and stems from the Astrylix studio. Preview free, license what fits, download instantly.",
  url: readSiteUrl(),
  supportEmail: readSupportEmail(),
  publicR2Domain:
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "https://cdn.example.invalid",

  // Play count display: only show if track has >= this many plays
  minPlayCountThreshold: 50,

  // Location-based landing page minimum content threshold
  minProducersForLocationPage: 5,
  minTracksForLandingPage: 5,
  minTracksForCityBeatPage: 5,
  reservedProducerUsernames: RESERVED_PRODUCER_USERNAMES,
  payoutsEnabled: readPayoutsEnabled(),

  // -------------------------------------------------------------------------
  // Phase 4: payments and fees
  // -------------------------------------------------------------------------

  /**
   * Platform fee charged on each sale, as a percentage (integer).
   * Example: 20 means 20% of the sale price.
   * This is a placeholder. Do not display this to producers in the UI yet.
   * Confirm the final rate before launch.
   */
  platformFeePercent: process.env.PLATFORM_FEE_PERCENT
    ? Number(process.env.PLATFORM_FEE_PERCENT)
    : null,

  /**
   * When true, USD price options are shown and Razorpay orders are created in USD.
   * Requires "International Payments" to be enabled on the Razorpay dashboard.
   * When false, only INR is offered.
   */
  internationalPaymentsEnabled: false,

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

  // Placeholder for the owner-approved refund window. Confirm before launch.
  refundWindowDays: Number(process.env.REFUND_WINDOW_DAYS || "14"),

  payoutMode: payoutModeValue,
}
