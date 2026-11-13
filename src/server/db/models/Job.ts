import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IJob extends Document {
  type: string;
  payload: Record<string, any>;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  error?: string | null;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  runAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String, default: null },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
    runAt: { type: Date, default: () => new Date(), index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

JobSchema.index({ status: 1, runAt: 1, lockedAt: 1 });

export const JobModel: Model<IJob> =
  mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema);

