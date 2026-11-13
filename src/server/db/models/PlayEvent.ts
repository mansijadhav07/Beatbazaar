import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlayEvent extends Document {
  trackId: string;
  hourBucket: Date;
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayEventSchema = new Schema<IPlayEvent>(
  {
    trackId: { type: String, required: true, index: true },
    hourBucket: { type: Date, required: true, index: true },
    playCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique compound index per track per hour bucket
PlayEventSchema.index({ trackId: 1, hourBucket: 1 }, { unique: true });

export const PlayEventModel: Model<IPlayEvent> =
  mongoose.models.PlayEvent ||
  mongoose.model<IPlayEvent>("PlayEvent", PlayEventSchema);

