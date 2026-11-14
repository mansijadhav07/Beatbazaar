import "server-only";

import { AuditLogModel } from "@/server/db/models/AuditLog";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import { connectMongoose } from "@/server/db/mongoose";
import { enqueueJob } from "@/server/jobs/queue";
import type { WebhookEvent } from "@/server/payments/types";

const SAFE_ACTIONS = new Set([
  "provider_review",
  "provider_action_required",
  "settlement_account_verification",
]);

export interface LinkedAccountStatusUpdate {
  status:
    | "not_started"
    | "in_review"
    | "needs_more_information"
    | "active"
    | "rejected"
    | "pending"
    | "verified";
  requiredActions: string[];
}

export function resolveLinkedAccountStatus(
  currentStatus: LinkedAccountStatusUpdate["status"],
  event: WebhookEvent
): LinkedAccountStatusUpdate {
  const routeStatus = (event.routeActivationStatus || "").toLowerCase();
  const accountStatus = (event.linkedAccountStatus || "").toLowerCase();
  const requiredActions = event.requiredActions.filter((action) =>
    SAFE_ACTIONS.has(action)
  );
  let status = currentStatus;

  if (
    routeStatus === "rejected" ||
    accountStatus === "rejected" ||
    accountStatus === "suspended"
  ) {
    status = "rejected";
  } else if (routeStatus === "needs_clarification") {
    status = "needs_more_information";
  } else if (
    routeStatus === "activated" &&
    !requiredActions.includes("settlement_account_verification")
  ) {
    status = "active";
  } else if (requiredActions.includes("settlement_account_verification")) {
    status = "needs_more_information";
  } else if (routeStatus === "under_review" || accountStatus === "created") {
    status = "in_review";
  }

  return { status, requiredActions };
}

export async function applyLinkedAccountWebhook(
  event: WebhookEvent
): Promise<void> {
  if (!event.linkedAccountId) return;
  await connectMongoose();
  const profile = await ProducerProfileModel.findOne({
    payoutAccountRef: event.linkedAccountId,
  });
  if (!profile) return;

  const previousStatus = profile.kycStatus;
  const update = resolveLinkedAccountStatus(previousStatus, event);
  const changed =
    previousStatus !== update.status ||
    JSON.stringify(profile.payoutRequiredActions) !==
      JSON.stringify(update.requiredActions);

  if (changed) {
    profile.kycStatus = update.status;
    profile.payoutRequiredActions = update.requiredActions;
    profile.payoutStatusUpdatedAt = new Date();
    if (update.status === "active") {
      profile.payoutActivatedAt = new Date();
    }
    await profile.save();
    await AuditLogModel.updateOne(
      {
        action: "producer_payout_status_updated",
        targetCollection: "producer_profiles",
        targetId: profile._id.toString(),
        "after.eventId": event.providerEventId,
      },
      {
        $setOnInsert: {
          actorId: "system",
          actorRole: "system",
          action: "producer_payout_status_updated",
          targetCollection: "producer_profiles",
          targetId: profile._id.toString(),
          before: { status: previousStatus },
          after: {
            status: update.status,
            requiredActions: update.requiredActions,
            eventId: event.providerEventId,
          },
          timestamp: new Date(),
        },
      },
      { upsert: true }
    );
  }

  if (update.status === "active") {
    await enqueueJob("process-producer-payouts", {
      producerId: profile.userId,
    });
  }
}
