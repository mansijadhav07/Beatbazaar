import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IEarningsLedgerEntry extends Document {
  producerId: string;
  orderId: string;
  orderItemIdx: number;
  entryType: "sale" | "reversal"; // reversals for refunds
  trackId: string;
  trackTitle: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
  grossAmount: number;    // integer minor units, sale currency
  platformFee: number;    // integer minor units, sale currency
  netAmount: number;      // grossAmount - platformFee
  currency: "INR" | "USD";
  gatewayFee?: number;    // nullable, filled in when known
  settledInr?: number;    // nullable, INR equivalent when settled
  status: "pending" | "settled" | "voided";
  createdAt: Date;
}

const EarningsLedgerSchema = new Schema<IEarningsLedgerEntry>(
  {
    producerId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    orderItemIdx: { type: Number, required: true },
    entryType: {
      type: String,
      enum: ["sale", "reversal"],
      required: true,
    },
    trackId: { type: String, required: true },
    trackTitle: { type: String, required: true },
    licenseTier: {
      type: String,
      enum: ["free", "non_exclusive", "exclusive"],
      required: true,
    },
    grossAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    netAmount: { type: Number, required: true },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    gatewayFee: { type: Number },
    settledInr: { type: Number },
    status: {
      type: String,
      enum: ["pending", "settled", "voided"],
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Append-only: each (order, item, entryType) combo is unique.
// Refunds create a separate "reversal" entry rather than mutating the original.
EarningsLedgerSchema.index(
  { orderId: 1, orderItemIdx: 1, entryType: 1 },
  { unique: true }
);

// Producer dashboard queries: show earnings newest first
EarningsLedgerSchema.index({ producerId: 1, createdAt: -1 });

export const EarningsLedgerModel: Model<IEarningsLedgerEntry> =
  mongoose.models.EarningsLedger ||
  mongoose.model<IEarningsLedgerEntry>("EarningsLedger", EarningsLedgerSchema);
