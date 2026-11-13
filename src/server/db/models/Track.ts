import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ITrackFile {
  kind: "preview" | "mp3" | "wav" | "stems";
  r2Key: string;
  size: number;
  checksum: string;
  mimeType: string;
}

export interface ILicenseOption {
  tier: "free" | "non_exclusive" | "exclusive";
  name: string;
  price: {
    amount: number; // integer minor units
    currency: "INR" | "USD";
  };
  includedFiles: Array<"preview" | "mp3" | "wav" | "stems">;
  termsVersion: string;
  enabled: boolean;
}

export interface ITrack extends Document {
  producerId: string;
  producerName?: string;
  title: string;
  slug: string;
  genre: string;
  language: string;
  bpm: number;
  key: string;
  moods: string[];
  tags: string[];
  coverKey?: string | null;
  status:
    | "draft"
    | "pending"
    | "live"
    | "rejected"
    | "sold_exclusive"
    | "removed";
  processingStatus: "queued" | "processing" | "ready" | "failed";
  processingError?: string | null;
  waveform: number[];
  playCount: number;
  files: ITrackFile[];
  licenses: ILicenseOption[];
  rightsConfirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrackFileSchema = new Schema<ITrackFile>(
  {
    kind: {
      type: String,
      enum: ["preview", "mp3", "wav", "stems"],
      required: true,
    },
    r2Key: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const LicenseOptionSchema = new Schema<ILicenseOption>(
  {
    tier: {
      type: String,
      enum: ["free", "non_exclusive", "exclusive"],
      required: true,
    },
    name: { type: String, required: true },
    price: {
      amount: { type: Number, required: true },
      currency: { type: String, enum: ["INR", "USD"], required: true },
    },
    includedFiles: [
      {
        type: String,
        enum: ["preview", "mp3", "wav", "stems"],
      },
    ],
    termsVersion: { type: String, default: "1.0" },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const TrackSchema = new Schema<ITrack>(
  {
    producerId: {
      type: String,
      required: true,
      index: true,
    },
    producerName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },
    genre: { type: String, required: true, index: true },
    language: { type: String, default: "Instrumental" },
    bpm: { type: Number, required: true, min: 40, max: 280, index: true },
    key: { type: String, required: true },
    moods: [{ type: String }],
    tags: [{ type: String }],
    coverKey: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "live",
        "rejected",
        "sold_exclusive",
        "removed",
      ],
      default: "draft",
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ["queued", "processing", "ready", "failed"],
      default: "ready",
      index: true,
    },
    processingError: { type: String, default: null },
    waveform: [{ type: Number }],
    playCount: { type: Number, default: 0 },
    files: [TrackFileSchema],
    licenses: [LicenseOptionSchema],
    rightsConfirmedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for browsing queries
TrackSchema.index({ status: 1, processingStatus: 1, genre: 1, bpm: 1, createdAt: -1 });

// Text index for search with default_language "none" to cover titles, tags, genre, moods, producerName
TrackSchema.index(
  {
    title: "text",
    tags: "text",
    genre: "text",
    moods: "text",
    producerName: "text",
  },
  {
    default_language: "none",
    name: "TrackTextSearchIndex",
  }
);

export const TrackModel: Model<ITrack> =
  mongoose.models.Track || mongoose.model<ITrack>("Track", TrackSchema);
