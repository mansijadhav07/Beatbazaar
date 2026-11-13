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

