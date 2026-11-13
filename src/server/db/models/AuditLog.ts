import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IAuditLog extends Document {
  actorId: string;
  actorRole: string;
  action: string;
  targetCollection: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: String, required: true, index: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetCollection: { type: String, required: true },
  targetId: { type: String, required: true },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

AuditLogSchema.index({ targetCollection: 1, targetId: 1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

