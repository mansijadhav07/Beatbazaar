import "server-only";
import mongoose from "mongoose";
import { siteConfig } from "@/config/site";
import { TrackModel, type ITrack } from "@/server/db/models/Track";
import { OrderModel, type IOrderItemSnapshot } from "@/server/db/models/Order";
import { CheckoutReservationModel } from "@/server/db/models/CheckoutReservation";
import { getPaymentProvider } from "./index";
import type { CheckoutResult } from "./types";
import { getPlatformFeePercent } from "./fees";
import { fulfillOrder } from "./fulfillment";

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
  amountMinorUnits: number;
  currency: "INR" | "USD";
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
    termsText: string;
    termsVersion: string;
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

    // 4. For exclusive items: reject known active reservations.
    if (item.licenseTier === "exclusive") {
      const existing = await CheckoutReservationModel.findOne({
        trackId: item.trackId,
        expiresAt: { $gt: new Date() },
      });
      if (existing) {
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

    if (!license.termsText?.trim()) {
      throw new CheckoutError(
        409,
        `The producer has not provided terms for "${track.title}".`
      );
    }

    resolvedItems.push({
      track,
      licenseTier: item.licenseTier,
      termsText: license.termsText,
      termsVersion: license.termsVersion,
      priceMinorUnits,
    });
  }

  // 6. Compute totals
  const totalAmount = resolvedItems.reduce(
    (sum, r) => sum + r.priceMinorUnits,
    0
  );
  const platformFeePercent = totalAmount > 0 ? getPlatformFeePercent() : 0;
  const orderItemPlatformFees = resolvedItems.map((item) =>
    Math.floor((item.priceMinorUnits * platformFeePercent) / 100)
  );
  const platformFeeAmount = orderItemPlatformFees.reduce(
    (sum, fee) => sum + fee,
    0
  );
  // LEGAL REVIEW REQUIRED: GST applicability TBD
  const taxAmount = null;

  // 7. Build order item snapshots
  const orderItems: IOrderItemSnapshot[] = resolvedItems.map((r, idx) => ({
    trackId: r.track!._id as mongoose.Types.ObjectId,
    title: r.track!.title,
    producerId: new mongoose.Types.ObjectId(r.track!.producerId),
    producerName: r.track!.producerName || "",
    licenseTier: r.licenseTier,
    termsText: r.termsText,
    termsVersion: r.termsVersion,
    platformFeeAmount: orderItemPlatformFees[idx],
    pricePaid: {
      amount: r.priceMinorUnits,
      currency,
    },
  }));

  // 8. Create Order document
  const order = await OrderModel.create({
    buyerId,
    buyerEmail,
    status: "pending",
    currency,
    totalAmount,
    taxAmount,
    platformFeeAmount,
    paymentProvider: "razorpay",
    items: orderItems,
  });

  const orderId = (order._id as mongoose.Types.ObjectId).toString();

  // Claim exclusive items atomically. The unique track index arbitrates races.
  try {
    for (let idx = 0; idx < resolvedItems.length; idx++) {
      if (resolvedItems[idx].licenseTier !== "exclusive") continue;
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + siteConfig.exclusiveReservationTtlSeconds * 1000
      );
      await CheckoutReservationModel.findOneAndUpdate(
        { trackId: items[idx].trackId, expiresAt: { $lte: now } },
        { $set: { buyerId, orderId, expiresAt } },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    await OrderModel.updateOne({ _id: order._id, status: "pending" }, { $set: { status: "failed" } });
    await CheckoutReservationModel.deleteMany({ orderId });
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new CheckoutError(
        409,
        "This beat is reserved by another buyer. Try again in a few minutes."
      );
    }
    throw error;
  }

  // 9. Free order: fulfill immediately
  if (totalAmount === 0) {
    await fulfillOrder(orderId);
    return {
      orderId,
      amountMinorUnits: totalAmount,
      currency,
      isFree: true,
    };
  }

  // 10. Paid order: create provider checkout
  const receiptId = `bb_${orderId}`.slice(0, 40); // Razorpay receipt max 40 chars
  let result: CheckoutResult;
  try {
    result = await getPaymentProvider().createCheckout({
      internalOrderId: orderId,
      currency,
      amountMinorUnits: totalAmount,
      receiptId,
      returnUrl,
    });
  } catch (error) {
    await OrderModel.updateOne({ _id: order._id, status: "pending" }, { $set: { status: "failed" } });
    await CheckoutReservationModel.deleteMany({ orderId });
    throw error;
  }

  order.providerOrderId = result.providerOrderId;
  await order.save();

  return {
    orderId,
    providerOrderId: result.providerOrderId,
    checkoutKeyId: result.checkoutKeyId,
    amountMinorUnits: totalAmount,
    currency,
    isFree: false,
  };
}

export { CheckoutError };
export type { CartItem, CreateOrderResult };
