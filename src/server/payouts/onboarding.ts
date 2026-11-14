import "server-only";

import { z } from "zod";
import { connectMongoose } from "@/server/db/mongoose";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import type { LinkedAccountInput, LinkedAccountResult } from "./route-gateway";

const OnboardingSchema = z
  .object({
    legalBusinessName: z.string().trim().min(2).max(200),
    phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/),
    pan: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
      .optional()
      .or(z.literal("")),
    beneficiaryName: z.string().trim().min(2).max(200),
    accountNumber: z.string().trim().regex(/^[0-9]{6,20}$/),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    acceptedProviderTerms: z.literal(true),
  })
  .strict();

export type OnboardingFormInput = z.input<typeof OnboardingSchema>;

export interface SafePayoutStatus {
  linkedAccountId: string;
  status: "in_review" | "needs_more_information" | "active" | "rejected";
  requiredActions: string[];
  submittedAt: Date;
  statusUpdatedAt: Date;
  activatedAt: Date | null;
}

export function parseOnboardingInput(value: unknown): OnboardingFormInput {
  return OnboardingSchema.parse(value);
}

export function safePayoutErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export function buildSafePayoutStatus(
  result: LinkedAccountResult,
  now: Date
): SafePayoutStatus {
  const activationStatus = result.activationStatus?.toLowerCase();
  const accountStatus = result.accountStatus.toLowerCase();
  const status: SafePayoutStatus["status"] =
    accountStatus === "rejected" || activationStatus === "rejected"
      ? "rejected"
      : activationStatus === "activated"
        ? "active"
        : activationStatus === "needs_clarification"
          ? "needs_more_information"
          : "in_review";

  return {
    linkedAccountId: result.id,
    status,
    requiredActions: [...new Set(result.requiredActions)],
    submittedAt: now,
    statusUpdatedAt: now,
    activatedAt: status === "active" ? now : null,
  };
}

export async function submitPayoutOnboarding(
  producerId: string,
  email: string,
  formValue: unknown,
  createLinkedAccount: (input: LinkedAccountInput) => Promise<LinkedAccountResult>,
  now = new Date()
): Promise<SafePayoutStatus> {
  const input = parseOnboardingInput(formValue);
  await connectMongoose();
  const profile = await ProducerProfileModel.findOne({ userId: producerId });
  if (!profile) throw new Error("Producer profile not found.");
  if (profile.payoutAccountRef) {
    throw new Error("Payout onboarding has already been submitted.");
  }

  const linkedAccount = await createLinkedAccount({
    producerId,
    email,
    phone: input.phone,
    legalBusinessName: input.legalBusinessName,
    pan: input.pan || undefined,
    beneficiaryName: input.beneficiaryName,
    accountNumber: input.accountNumber,
    ifsc: input.ifsc,
  });
  const safeStatus = buildSafePayoutStatus(linkedAccount, now);

  profile.payoutAccountRef = safeStatus.linkedAccountId;
  profile.kycStatus = safeStatus.status;
  profile.payoutRequiredActions = safeStatus.requiredActions;
  profile.payoutSubmittedAt = safeStatus.submittedAt;
  profile.payoutStatusUpdatedAt = safeStatus.statusUpdatedAt;
  profile.payoutActivatedAt = safeStatus.activatedAt;
  await profile.save();

  return safeStatus;
}
