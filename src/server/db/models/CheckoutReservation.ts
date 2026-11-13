import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICheckoutReservation extends Document {
  trackId: string;
  buyerId: string;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
}

const CheckoutReservationSchema = new Schema<ICheckoutReservation>(
  {
    trackId: { type: String, required: true },
    buyerId: { type: String, required: true },
    orderId: { type: String, required: true },
    // TTL index on expiresAt: MongoDB auto-deletes when expiresAt is reached
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Only one reservation per track at a time
CheckoutReservationSchema.index({ trackId: 1 }, { unique: true });

// TTL: auto-expire reservations when expiresAt passes
CheckoutReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CheckoutReservationModel: Model<ICheckoutReservation> =
  mongoose.models.CheckoutReservation ||
  mongoose.model<ICheckoutReservation>(
    "CheckoutReservation",
    CheckoutReservationSchema
  );
