import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOrderItemSnapshot {
  trackId: mongoose.Types.ObjectId;
  title: string;
  producerId: mongoose.Types.ObjectId;
  producerName: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
  termsText: string;
  termsVersion: string;
  pricePaid: {
    amount: number;
    currency: "INR" | "USD";
  };
}

export interface IOrder extends Document {
  buyerId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  currency: "INR" | "USD";
  totalAmount: number;
  taxAmount: number;
  platformFeeAmount: number;
  paymentProvider?: "razorpay" | "stripe";
  paymentRef?: string;
  items: IOrderItemSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    trackId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    producerId: { type: Schema.Types.ObjectId, required: true },
    producerName: { type: String, required: true },
    licenseTier: {
      type: String,
      enum: ["free", "non_exclusive", "exclusive"],
      required: true,
    },
    termsText: { type: String, required: true },
    termsVersion: { type: String, required: true },
    pricePaid: {
      amount: { type: Number, required: true },
      currency: { type: String, enum: ["INR", "USD"], required: true },
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    totalAmount: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    platformFeeAmount: { type: Number, default: 0 },
    paymentProvider: { type: String, enum: ["razorpay", "stripe"] },
    paymentRef: { type: String, sparse: true, unique: true },
    items: [OrderItemSnapshotSchema],
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ buyerId: 1, createdAt: -1 });

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

