import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AdminStepUpAction =
  | "track_moderate"
  | "track_feature"
  | "report_update"
  | "order_refund";

export interface IAdminStepUpToken extends Document {
  tokenHash: string;
  userId: string;
  sessionId: string;
  action: AdminStepUpAction;
  targetId: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const AdminStepUpTokenSchema = new Schema<IAdminStepUpToken>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["track_moderate", "track_feature", "report_update", "order_refund"],
      required: true,
    },
    targetId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "admin_step_up_tokens",
  }
);

AdminStepUpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminStepUpTokenModel: Model<IAdminStepUpToken> =
  mongoose.models.AdminStepUpToken ||
  mongoose.model<IAdminStepUpToken>("AdminStepUpToken", AdminStepUpTokenSchema);
