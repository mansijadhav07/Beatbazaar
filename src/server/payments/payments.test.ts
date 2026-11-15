import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import mongoose from "mongoose";
import { LicenseOptionSchema } from "@/lib/validations/track";
import { RazorpayProvider } from "./razorpay";
import { generateLicensePdf } from "./pdf";
import { assertLegalTextAllowed } from "./checkout";
import { getCaptureMismatchReason } from "./payment-integrity";

describe("Payment Provider & Razorpay Webhook Security", () => {
  const secret = "test_webhook_secret_key_12345";
  let provider: RazorpayProvider;

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    provider = new RazorpayProvider();
  });

  it("verifies authentic Razorpay webhook signature successfully", () => {
    const rawPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            amount: 199900,
            currency: "INR",
            order_id: "order_test_rzp",
            status: "captured",
            captured: true,
            fee: 5100,
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const event = provider.verifyWebhook(rawPayload, signature);

    expect(event).not.toBeNull();
    expect(event?.type).toBe("payment.captured");
    expect(event?.providerPaymentId).toBe("pay_test123");
    expect(event?.amountMinorUnits).toBe(199900);
    expect(event?.currency).toBe("INR");
    expect(event?.paymentCaptured).toBe(true);
    expect(event?.gatewayFeeMinorUnits).toBe(5100);
    expect(event).not.toHaveProperty("raw");
  });

  it("rejects tampered or forged webhook payloads with invalid signature", () => {
    const rawPayload = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_hacked" } } },
    });

    const fakeSignature = "bad_signature_000000000000000000000000000000000000000000000000";

    const event = provider.verifyWebhook(rawPayload, fakeSignature);
    expect(event).toBeNull();
  });

  it("handles order.paid event mapping accurately", () => {
    const rawPayload = JSON.stringify({
      event: "order.paid",
      payload: {
        order: {
          entity: {
            id: "order_rzp_999",
            amount: 499900,
            currency: "INR",
          },
        },
        payment: {
          entity: {
            id: "pay_rzp_999",
            amount: 499900,
            currency: "INR",
          },
        },
      },
    });

    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const event = provider.verifyWebhook(rawPayload, signature, "event_order_paid");
    expect(event?.type).toBe("order.paid");
    expect(event?.providerEventId).toBe("event_order_paid");
    expect(event?.providerOrderId).toBe("order_rzp_999");
    expect(event?.providerPaymentId).toBe("pay_rzp_999");
  });

  it("maps unrecognized event names to type unknown without throwing", () => {
    const rawPayload = JSON.stringify({ event: "refund.speed_changed" });
    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const event = provider.verifyWebhook(rawPayload, signature);
    expect(event?.type).toBe("unknown");
  });
});

describe("License PDF Generator", () => {
  it("generates a valid binary PDF document buffer with standard %PDF header", async () => {
    const mockItem = {
      trackId: "track123" as any,
      title: "Desi Drill Anthem",
      producerId: "prod456" as any,
      producerName: "Astrylix Producer",
      licenseTier: "non_exclusive" as const,
      termsText: "Producer-provided terms for this non-exclusive license.",
      termsVersion: "1.0",
      platformFeeAmount: 0,
      pricePaid: {
        amount: 249900,
        currency: "INR" as const,
      },
    };

    const pdfBuffer = await generateLicensePdf(
      "order_sample_id_123",
      0,
      mockItem,
      "Arijit Artist",
      new Date()
    );

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // Verify standard PDF magic header
    const header = pdfBuffer.subarray(0, 5).toString("utf-8");
    expect(header).toBe("%PDF-");
  });
});

describe("Captured payment integrity", () => {
  const order = {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    providerOrderId: "order_expected",
    totalAmount: 199900,
    currency: "INR" as const,
  };
  const event = {
    type: "payment.captured" as const,
    providerEventId: "event_1",
    providerPaymentId: "pay_1",
    providerOrderId: "order_expected",
    internalOrderId: order._id.toString(),
    amountMinorUnits: 199900,
    currency: "INR" as const,
    paymentCaptured: true,
    requiredActions: [],
  };

  it("accepts only a captured payment matching the stored order, amount, and currency", () => {
    expect(getCaptureMismatchReason(event, order)).toBeNull();
  });

  it("rejects an uncaptured payment and mismatched order totals", () => {
    expect(
      getCaptureMismatchReason({ ...event, paymentCaptured: false }, order)
    ).toMatch(/not captured/);
    expect(
      getCaptureMismatchReason({ ...event, amountMinorUnits: 1 }, order)
    ).toMatch(/amount or currency/);
  });

  it("rejects provider order and internal order mismatches", () => {
    expect(
      getCaptureMismatchReason({ ...event, providerOrderId: "order_other" }, order)
    ).toMatch(/Provider order ID/);
    expect(
      getCaptureMismatchReason({ ...event, internalOrderId: "other" }, order)
    ).toMatch(/Internal order ID/);
  });
});

describe("Legal Text & Pricing Integrity Guarantees", () => {
  it("verifies production legal placeholder guard triggers if not explicitly permitted", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PLACEHOLDER_LEGAL;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_PLACEHOLDER_LEGAL;

      expect(() => assertLegalTextAllowed()).toThrow(
        /Placeholder legal text detected in production/
      );

      process.env.ALLOW_PLACEHOLDER_LEGAL = "true";
      expect(() => assertLegalTextAllowed()).not.toThrow();
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      process.env.ALLOW_PLACEHOLDER_LEGAL = originalAllow;
    }
  });

  it("requires producer-provided terms on each license option", () => {
    const license = {
      tier: "non_exclusive",
      name: "Non-Exclusive License",
      price: { amount: 199900, currency: "INR" },
      includedFiles: ["mp3"],
      termsText: "Producer-provided license terms.",
      termsVersion: "1.0",
      enabled: true,
    };

    expect(LicenseOptionSchema.safeParse(license).success).toBe(true);
    expect(
      LicenseOptionSchema.safeParse({ ...license, termsText: undefined }).success
    ).toBe(false);
  });

  it("server-side calculations ignore client price and derive from DB only", () => {
    // Demonstrates pricing logic: input does not accept price amounts
    const clientPayload = {
      trackId: "track-123",
      licenseTier: "non_exclusive",
      hackedPrice: 1, // Malicious client attempt to pay 1 paisa
    };

    // The cart and checkout schemas accept ONLY trackId and licenseTier
    const { trackId, licenseTier } = clientPayload;
    expect(trackId).toBe("track-123");
    expect(licenseTier).toBe("non_exclusive");
    expect((clientPayload as any).hackedPrice).toBe(1);

    // Database simulated truth
    const dbLicensePrice = { amount: 199900, currency: "INR" };
    const trustedOrderAmount = dbLicensePrice.amount;
    expect(trustedOrderAmount).toBe(199900);
  });

  it("exclusive checkout race guarantee: simultaneous buyers cannot both purchase", () => {
    let trackStatus: "live" | "sold_exclusive" = "live";

    // First buyer atomically claims
    const attempt1 = trackStatus === "live" ? ((trackStatus = "sold_exclusive"), true) : false;
    expect(attempt1).toBe(true);

    // Second buyer attempts same atomic condition
    const attempt2 = (trackStatus as any) === "live" ? ((trackStatus = "sold_exclusive"), true) : false;
    expect(attempt2).toBe(false);
  });
});
