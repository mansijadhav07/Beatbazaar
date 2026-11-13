import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPayout extends Document {
  producerId: mongoose.Types.ObjectId;
  period: string;
  currency: "INR" | "USD";
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  status: "pending" | "processing" | "completed" | "failed";
  payoutRef?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    producerId: {
      type: Schema.Types.ObjectId,
      ref: "ProducerProfile",
      required: true,
      index: true,
    },
    period: { type: String, required: true },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    grossAmount: { type: Number, required: true },
    platformFeeAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    payoutRef: { type: String },
    processedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

PayoutSchema.index({ producerId: 1, period: 1 }, { unique: true });

export const PayoutModel: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);

