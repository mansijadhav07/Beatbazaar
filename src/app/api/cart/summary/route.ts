import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const CartSummaryRequestSchema = z.object({
  items: z.array(
    z.object({
      trackId: z.string().min(1),
      licenseTier: z.enum(["free", "non_exclusive", "exclusive"]),
    })
  ),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";

    const rateCheck = await checkRateLimit(`cart-summary:${ip}`, {
      windowMs: 60 * 1000,
      maxRequests: 60,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many cart requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = CartSummaryRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid cart items format." },
        { status: 400 }
      );
    }

    const requestedCurrency = parsed.data.currency;
    if (requestedCurrency === "USD" && !siteConfig.internationalPaymentsEnabled) {
      return NextResponse.json(
        { error: "USD currency is not enabled on this marketplace." },
        { status: 400 }
      );
    }

    await connectMongoose();

    const summaryItems: Array<{
      trackId: string;
      licenseTier: "free" | "non_exclusive" | "exclusive";
      title: string;
      producerName: string;
      coverKey: string | null;
      includedFiles?: string[];
      termsText?: string;
      termsVersion?: string;
      price: { amount: number; currency: "INR" | "USD" };
      available: boolean;
      unavailabilityReason?: string;
    }> = [];

    let totalAmount = 0;

    for (const item of parsed.data.items) {
      if (!mongoose.isValidObjectId(item.trackId)) {
        summaryItems.push({
          trackId: item.trackId,
          licenseTier: item.licenseTier,
          title: "Unknown Beat",
          producerName: "Unknown",
          coverKey: null,
          price: { amount: 0, currency: requestedCurrency },
          available: false,
          unavailabilityReason: "Invalid beat ID",
        });
        continue;
      }

      const track = await TrackModel.findById(item.trackId);
      if (!track || track.status !== "live" || track.processingStatus !== "ready") {
        summaryItems.push({
          trackId: item.trackId,
          licenseTier: item.licenseTier,
          title: track?.title || "Unavailable Beat",
          producerName: track?.producerName || "Producer",
          coverKey: track?.coverKey || null,
          price: { amount: 0, currency: requestedCurrency },
          available: false,
          unavailabilityReason: track?.status === "sold_exclusive"
            ? "Sold Exclusively"
            : "Beat is no longer available",
        });
        continue;
      }

      const license = track.licenses.find(
        (l) =>
          l.tier === item.licenseTier &&
          l.enabled &&
          (l.price.currency === "INR" || siteConfig.internationalPaymentsEnabled)
      );

      if (!license) {
        summaryItems.push({
          trackId: item.trackId,
          licenseTier: item.licenseTier,
          title: track.title,
          producerName: track.producerName || "Producer",
          coverKey: track.coverKey || null,
          price: { amount: 0, currency: requestedCurrency },
          available: false,
          unavailabilityReason: `The ${item.licenseTier} license tier is disabled for this beat`,
        });
        continue;
      }

      if (!license.termsText?.trim()) {
        summaryItems.push({
          trackId: item.trackId,
          licenseTier: item.licenseTier,
          title: track.title,
          producerName: track.producerName || "Producer",
          coverKey: track.coverKey || null,
          price: { amount: 0, currency: requestedCurrency },
          available: false,
          unavailabilityReason: "The producer has not provided license terms.",
        });
        continue;
      }

      let priceAmount = license.price.amount;
      if (requestedCurrency === "USD") {
        if (license.price.currency !== "USD") {
          priceAmount = Math.round((license.price.amount / siteConfig.usdToInrRate) * 100);
        }
      } else {
        if (license.price.currency !== "INR") {
          priceAmount = Math.round((license.price.amount / 100) * siteConfig.usdToInrRate);
        }
      }

      summaryItems.push({
        trackId: item.trackId,
        licenseTier: item.licenseTier,
        title: track.title,
        producerName: track.producerName || "Producer",
        coverKey: track.coverKey || null,
        includedFiles: license.includedFiles,
        termsText: license.termsText,
        termsVersion: license.termsVersion,
        price: { amount: priceAmount, currency: requestedCurrency },
        available: true,
      });

      totalAmount += priceAmount;
    }

    return NextResponse.json({
      items: summaryItems,
      totalAmount,
      currency: requestedCurrency,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to calculate cart summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
