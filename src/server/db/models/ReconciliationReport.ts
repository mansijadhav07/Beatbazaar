import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IReconciliationMismatch {
  kind:
    | "provider_transfer_missing"
    | "local_transfer_missing"
    | "transfer_status_mismatch"
    | "settlement_missing";
  localTransferId?: string;
  providerTransferId?: string;
  settlementId?: string;
  detail: string;
}

export interface IReconciliationReport extends Document {
  runId: string;
  from: Date;
  to: Date;
  status: "clean" | "mismatch";
  mismatchCount: number;
  mismatches: IReconciliationMismatch[];
  createdAt: Date;
}

const ReconciliationMismatchSchema = new Schema<IReconciliationMismatch>(
  {
    kind: {
      type: String,
      enum: [
        "provider_transfer_missing",
        "local_transfer_missing",
        "transfer_status_mismatch",
        "settlement_missing",
      ],
      required: true,
    },
    localTransferId: { type: String },
    providerTransferId: { type: String },
    settlementId: { type: String },
    detail: { type: String, required: true },
  },
  { _id: false }
);

const ReconciliationReportSchema = new Schema<IReconciliationReport>(
  {
    runId: { type: String, required: true, unique: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    status: { type: String, enum: ["clean", "mismatch"], required: true },
    mismatchCount: { type: Number, required: true },
    mismatches: { type: [ReconciliationMismatchSchema], default: [] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "reconciliation_reports",
  }
);

ReconciliationReportSchema.index({ createdAt: -1 });

export const ReconciliationReportModel: Model<IReconciliationReport> =
  mongoose.models.ReconciliationReport ||
  mongoose.model<IReconciliationReport>(
    "ReconciliationReport",
    ReconciliationReportSchema
  );
