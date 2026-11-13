import "server-only";
import mongoose from "mongoose";
import { siteConfig } from "@/config/site";
import { TrackModel, type ITrack } from "@/server/db/models/Track";
import { OrderModel, type IOrderItemSnapshot } from "@/server/db/models/Order";
import { CheckoutReservationModel } from "@/server/db/models/CheckoutReservation";
import { getPaymentProvider } from "./index";
import { fulfillOrder } from "./fulfillment";

// LEGAL REVIEW REQUIRED: This is placeholder license terms text.
// Replace with reviewed legal text before going live.
// Production guard: startup fails if ALLOW_PLACEHOLDER_LEGAL is not "true".
export const TERMS_TEXT = `[LEGAL REVIEW REQUIRED] Placeholder license terms. This text has not been reviewed by a lawyer and must be replaced before the platform goes live. By purchasing this license you agree to the terms provided by the producer. The platform fee is non-refundable after download. Beatbazaar acts as a marketplace and is not a party to the license agreement between buyer and producer.`;

export const TERMS_VERSION = "0.1-placeholder";

export function assertLegalTextAllowed(): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PLACEHOLDER_LEGAL !== "true"
  ) {
    throw new Error(
      "Placeholder legal text detected in production. Set ALLOW_PLACEHOLDER_LEGAL=true to override, or replace with reviewed legal text."
    );
  }
}

interface CartItem {
  trackId: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
}

interface CreateOrderResult {
  orderId: string;
  providerOrderId?: string;
  checkoutKeyId?: string;
  isFree: boolean;
}

class CheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export async function createOrder(
  buyerId: string,
  buyerEmail: string,
  items: CartItem[],
  currency: "INR" | "USD",
  returnUrl: string
): Promise<CreateOrderResult> {
  assertLegalTextAllowed();

  // 1. Validate currency
  if (!siteConfig.internationalPaymentsEnabled && currency === "USD") {
    throw new CheckoutError(400, "International payments are not enabled.");
  }

  if (items.length === 0) {
    throw new CheckoutError(400, "Cart is empty.");
  }

  // 2+3. Fetch and validate each track and license from DB
  const resolvedItems: Array<{
    track: ITrack;
    licenseTier: CartItem["licenseTier"];
    priceMinorUnits: number;
  }> = [];

  for (const item of items) {
    if (!mongoose.isValidObjectId(item.trackId)) {
      throw new CheckoutError(400, `Invalid track ID: ${item.trackId}`);
    }

    const track = await TrackModel.findById(item.trackId);
    if (!track || track.status !== "live" || track.processingStatus !== "ready") {
      throw new CheckoutError(
        404,
        `Track not available for purchase: ${item.trackId}`
      );
    }

    const license = track.licenses.find(
      (l) => l.tier === item.licenseTier && l.enabled
    );
    if (!license) {
      throw new CheckoutError(
        400,
        `License tier "${item.licenseTier}" is not available for track: ${track.title}`
      );
    }

    // 4. For exclusive items: check for conflicting reservations
    if (item.licenseTier === "exclusive") {
      const existing = await CheckoutReservationModel.findOne({
        trackId: item.trackId,
      });
      if (existing && existing.buyerId !== buyerId) {
        throw new CheckoutError(
          409,
          "This beat is reserved by another buyer. Try again in a few minutes."
        );
      }
    }

    // 5. Compute price from DB, never from client
    let priceMinorUnits: number;
    if (currency === "USD") {
      if (license.price.currency === "USD") {
        priceMinorUnits = license.price.amount;
      } else {
        // Convert INR paise to USD cents using stored exchange rate
        priceMinorUnits = Math.round(
          (license.price.amount / siteConfig.usdToInrRate) * 100
        );
      }
    } else {
      // INR: use price as-is (assume stored in paise)
      if (license.price.currency === "INR") {
        priceMinorUnits = license.price.amount;
      } else {
        // Convert USD cents to INR paise
        priceMinorUnits = Math.round(
          (license.price.amount / 100) * siteConfig.usdToInrRate
        );
      }
    }

    resolvedItems.push({ track, licenseTier: item.licenseTier, priceMinorUnits });
  }

  // 6. Compute totals
  const totalAmount = resolvedItems.reduce(
    (sum, r) => sum + r.priceMinorUnits,
    0
  );
  const platformFeeAmount = Math.floor(
    (totalAmount * siteConfig.platformFeePercent) / 100
  );
  // LEGAL REVIEW REQUIRED: GST applicability TBD
  const taxAmount = 0;

  // 7. Build order item snapshots
  const orderItems: IOrderItemSnapshot[] = resolvedItems.map((r) => ({
    trackId: r.track!._id as mongoose.Types.ObjectId,
    title: r.track!.title,
    producerId: new mongoose.Types.ObjectId(r.track!.producerId),
    producerName: r.track!.producerName || "",
    licenseTier: r.licenseTier,
    termsText: TERMS_TEXT,
    termsVersion: TERMS_VERSION,
    pricePaid: {
      amount: r.priceMinorUnits,
      currency,
    },
  }));

  // 8. Create Order document
  const order = await OrderModel.create({
    buyerId,
    status: "pending",
    currency,
    totalAmount,
    taxAmount,
    platformFeeAmount,
    paymentProvider: "razorpay",
    items: orderItems,
  });

  const orderId = (order._id as mongoose.Types.ObjectId).toString();

  // Upsert checkout reservations for exclusive items
  for (let idx = 0; idx < resolvedItems.length; idx++) {
    const r = resolvedItems[idx];
    if (r.licenseTier === "exclusive") {
      const expiresAt = new Date(
        Date.now() + siteConfig.exclusiveReservationTtlSeconds * 1000
      );
      await CheckoutReservationModel.findOneAndUpdate(
        { trackId: items[idx].trackId },
        {
          trackId: items[idx].trackId,
          buyerId,
          orderId,
          expiresAt,
        },
        { upsert: true, new: true }
      );
    }
  }

  // 9. Free order: fulfill immediately
  if (totalAmount === 0) {
    await fulfillOrder(orderId);
    return { orderId, isFree: true };
  }

  // 10. Paid order: create provider checkout
  const receiptId = `bb_${orderId}`.slice(0, 40); // Razorpay receipt max 40 chars
  const result = await getPaymentProvider().createCheckout({
    internalOrderId: orderId,
    currency,
    amountMinorUnits: totalAmount,
    receiptId,
    returnUrl,
  });

  return {
    orderId,
    providerOrderId: result.providerOrderId,
    checkoutKeyId: result.checkoutKeyId,
    isFree: false,
  };
}

export { CheckoutError };
export type { CartItem, CreateOrderResult };
