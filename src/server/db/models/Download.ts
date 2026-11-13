import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDownloadToken extends Document {
  orderId: mongoose.Types.ObjectId;
  itemId: string;
  token: string;
  issuedAt: Date;
  expiresAt: Date;
  ipHash: string;
  downloadCount: number;
}

const DownloadTokenSchema = new Schema<IDownloadToken>({
  orderId: { type: Schema.Types.ObjectId, required: true, index: true },
  itemId: { type: String, required: true },
  token: { type: String, required: true, unique: true, index: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  ipHash: { type: String, default: "" },
  downloadCount: { type: Number, default: 0 },
});

// TTL index to automatically purge expired tokens from MongoDB
DownloadTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DownloadTokenModel: Model<IDownloadToken> =
  mongoose.models.DownloadToken ||
  mongoose.model<IDownloadToken>("DownloadToken", DownloadTokenSchema);

export interface IDownloadRecord extends Document {
  orderId: mongoose.Types.ObjectId;
  orderItemIdx: number;
  trackId: mongoose.Types.ObjectId;
  buyerId: string;
  revoked: boolean;
  downloadCount: number;
  lastDownloadedAt?: Date;
  createdAt: Date;
}

const DownloadRecordSchema = new Schema<IDownloadRecord>(
  {
    orderId: { type: Schema.Types.ObjectId, required: true, index: true },
    orderItemIdx: { type: Number, required: true },
    trackId: { type: Schema.Types.ObjectId, required: true },
    buyerId: { type: String, required: true, index: true },
    revoked: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    lastDownloadedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

DownloadRecordSchema.index({ orderId: 1, orderItemIdx: 1 }, { unique: true });

export const DownloadRecordModel: Model<IDownloadRecord> =
  mongoose.models.DownloadRecord ||
  mongoose.model<IDownloadRecord>("DownloadRecord", DownloadRecordSchema);

