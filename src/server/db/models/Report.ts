import mongoose, { Schema, type Document, type Model } from "mongoose";

export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";

export interface IReport extends Document {
  trackId: mongoose.Types.ObjectId;
  trackTitle: string;
  reporterId?: string;
  reporterEmail: string;
  category: "copyright" | "audio_quality" | "misleading_metadata" | "other";
  details: string;
  status: ReportStatus;
  adminNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    trackId: { type: Schema.Types.ObjectId, required: true, index: true },
    trackTitle: { type: String, required: true },
    reporterId: { type: String, index: true },
    reporterEmail: { type: String, required: true },
    category: {
      type: String,
      enum: ["copyright", "audio_quality", "misleading_metadata", "other"],
      required: true,
    },
    details: { type: String, required: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["open", "in_review", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    adminNote: { type: String, maxlength: 2000 },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true, collection: "reports" }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ trackId: 1, createdAt: -1 });

export const ReportModel: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
