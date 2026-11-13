import { z } from "zod";
import { CurrencyCodeSchema } from "./track";

export const PayoutStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

export const PayoutSchema = z.object({
  id: z.string().optional(),
  producerId: z.string(),
  period: z.string(), // e.g. "2026-11"
  currency: CurrencyCodeSchema,
  grossAmount: z.number().int().nonnegative(),
  platformFeeAmount: z.number().int().nonnegative(),
  netAmount: z.number().int().nonnegative(),
  status: PayoutStatusSchema.default("pending"),
  payoutRef: z.string().optional(),
  processedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Payout = z.infer<typeof PayoutSchema>;

