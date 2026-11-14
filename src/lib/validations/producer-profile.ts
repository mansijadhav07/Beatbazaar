import { z } from "zod";

export const KycStatusSchema = z.enum([
  "not_started",
  "in_review",
  "needs_more_information",
  "active",
  "rejected",
  "pending",
  "verified",
]);
export type KycStatus = z.infer<typeof KycStatusSchema>;

export const PayoutRequiredActionSchema = z.enum([
  "provider_review",
  "provider_action_required",
  "settlement_account_verification",
]);

export const LocationSchema = z.object({
  country: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
});
export type LocationData = z.infer<typeof LocationSchema>;

export const ProducerProfileSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug must contain only lowercase letters, numbers, and single hyphens",
    }),
  displayName: z.string().min(2).max(80),
  bio: z.string().max(500).default(""),
  avatarKey: z.string().nullable().optional(),
  location: LocationSchema,
  verified: z.boolean().default(false),
  kycStatus: KycStatusSchema.default("not_started"),
  payoutAccountRef: z.string().nullable().optional(),
  payoutRequiredActions: z.array(PayoutRequiredActionSchema).default([]),
  payoutSubmittedAt: z.date().nullable().optional(),
  payoutStatusUpdatedAt: z.date().nullable().optional(),
  payoutActivatedAt: z.date().nullable().optional(),
  followerCount: z.number().int().nonnegative().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type ProducerProfile = z.infer<typeof ProducerProfileSchema>;
