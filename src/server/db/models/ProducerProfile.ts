import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IProducerProfile extends Document {
  userId: string;
  slug: string;
  displayName: string;
  bio: string;
  avatarKey?: string | null;
  location: {
    country: string;
    state: string;
    city: string;
  };
  verified: boolean;
  kycStatus: "not_started" | "pending" | "verified" | "rejected";
  payoutAccountRef?: string | null;
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProducerProfileSchema = new Schema<IProducerProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: "" },
    avatarKey: { type: String, default: null },
    location: {
      country: { type: String, required: true },
      state: { type: String, required: true },
      city: { type: String, required: true },
    },
    verified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ["not_started", "pending", "verified", "rejected"],
      default: "not_started",
    },
    payoutAccountRef: { type: String, default: null },
    followerCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Location indexes for SEO location landing pages
ProducerProfileSchema.index({ "location.country": 1, "location.state": 1, "location.city": 1 });

export const ProducerProfileModel: Model<IProducerProfile> =
  mongoose.models.ProducerProfile ||
  mongoose.model<IProducerProfile>("ProducerProfile", ProducerProfileSchema);

