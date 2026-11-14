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
  kycStatus:
    | "not_started"
    | "in_review"
    | "needs_more_information"
    | "active"
    | "rejected"
    | "pending"
    | "verified";
  payoutAccountRef?: string | null;
  payoutRequiredActions: string[];
  payoutSubmittedAt?: Date | null;
  payoutStatusUpdatedAt?: Date | null;
  payoutActivatedAt?: Date | null;
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
      enum: [
        "not_started",
        "in_review",
        "needs_more_information",
        "active",
        "rejected",
        "pending",
        "verified",
      ],
      default: "not_started",
    },
    payoutAccountRef: { type: String, default: null },
    payoutRequiredActions: {
      type: [String],
      enum: [
        "provider_review",
        "provider_action_required",
        "settlement_account_verification",
      ],
      default: [],
    },
    payoutSubmittedAt: { type: Date, default: null },
    payoutStatusUpdatedAt: { type: Date, default: null },
    payoutActivatedAt: { type: Date, default: null },
    followerCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Location indexes for SEO location landing pages
ProducerProfileSchema.index({ "location.country": 1, "location.state": 1, "location.city": 1 });
ProducerProfileSchema.index(
  { payoutAccountRef: 1 },
  {
    unique: true,
    partialFilterExpression: { payoutAccountRef: { $type: "string" } },
    name: "idx_producer_payout_account_unique",
  }
);

export const ProducerProfileModel: Model<IProducerProfile> =
  mongoose.models.ProducerProfile ||
  mongoose.model<IProducerProfile>("ProducerProfile", ProducerProfileSchema);
