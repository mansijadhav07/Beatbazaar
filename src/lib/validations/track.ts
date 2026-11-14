import { z } from "zod";

export const TrackStatusSchema = z.enum([
  "draft",
  "pending",
  "live",
  "rejected",
  "sold_exclusive",
  "removed",
]);
export type TrackStatus = z.infer<typeof TrackStatusSchema>;

export const ProcessingStatusSchema = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;

export const FileKindSchema = z.enum(["preview", "mp3", "wav", "stems"]);
export type FileKind = z.infer<typeof FileKindSchema>;

export const TrackFileSchema = z.object({
  kind: FileKindSchema,
  r2Key: z.string().min(1),
  size: z.number().int().positive(),
  checksum: z.string().min(1),
  mimeType: z.string(),
});
export type TrackFile = z.infer<typeof TrackFileSchema>;

export const LicenseTierSchema = z.enum(["free", "non_exclusive", "exclusive"]);
export type LicenseTier = z.infer<typeof LicenseTierSchema>;

export const CurrencyCodeSchema = z.enum(["INR", "USD"]);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const MoneySchema = z.object({
  amount: z.number().int().nonnegative(), // integer minor units (e.g. 199900 = 1999.00 INR)
  currency: CurrencyCodeSchema,
});
export type Money = z.infer<typeof MoneySchema>;

export const LicenseOptionSchema = z.object({
  tier: LicenseTierSchema,
  name: z.string(),
  price: MoneySchema,
  includedFiles: z.array(FileKindSchema).min(1),
  termsText: z.string().trim().min(1).max(5000),
  termsVersion: z.string().default("1.0"),
  enabled: z.boolean().default(true),
});
export type LicenseOption = z.infer<typeof LicenseOptionSchema>;

export const TrackSchema = z.object({
  id: z.string().optional(),
  producerId: z.string(),
  title: z.string().min(1).max(100),
  slug: z.string().min(1).max(120),
  genre: z.string().min(1).max(50),
  language: z.string().max(50).default("Instrumental"),
  bpm: z.number().int().min(40).max(280),
  key: z.string().max(10), // e.g. "C Minor", "F# Major"
  moods: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  coverKey: z.string().nullable().optional(),
  status: TrackStatusSchema.default("draft"),
  processingStatus: ProcessingStatusSchema.default("ready"),
  processingError: z.string().nullable().optional(),
  waveform: z.array(z.number().min(0).max(1)).default([]), // ~500 normalized waveform peaks (0 to 1)
  playCount: z.number().int().nonnegative().default(0),
  files: z.array(TrackFileSchema).default([]),
  licenses: z.array(LicenseOptionSchema).default([]),
  rightsConfirmedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Track = z.infer<typeof TrackSchema>;
