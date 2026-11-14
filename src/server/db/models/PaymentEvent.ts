import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPaymentEvent extends Document {
  provider: "razorpay" | "stripe";
  eventId: string;
  eventType: string;
  orderId?: string;
  status: "processing" | "processed" | "failed";
  processedAt: Date;
}

const PaymentEventSchema = new Schema<IPaymentEvent>({
  provider: {
    type: String,
    enum: ["razorpay", "stripe"],
    required: true,
  },
  eventId: { type: String, required: true },
  eventType: { type: String, required: true },
  orderId: { type: String },
  status: {
    type: String,
    enum: ["processing", "processed", "failed"],
    default: "processing",
    index: true,
  },
  processedAt: { type: Date, default: Date.now },
});

// Idempotency: ensure each event from each provider is processed at most once
PaymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

// TTL: keep payment events for 90 days then auto-purge
PaymentEventSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 3600 }
);

export const PaymentEventModel: Model<IPaymentEvent> =
  mongoose.models.PaymentEvent ||
  mongoose.model<IPaymentEvent>("PaymentEvent", PaymentEventSchema);
