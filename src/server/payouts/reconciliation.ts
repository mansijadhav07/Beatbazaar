import "server-only";

import crypto from "node:crypto";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";
import { ReconciliationReportModel, type IReconciliationMismatch } from "@/server/db/models/ReconciliationReport";
import { connectMongoose } from "@/server/db/mongoose";
import {
  createRouteGateway,
  type RouteGateway,
  type RouteTransferResult,
  type SettlementReconEntry,
} from "./route-gateway";

interface LocalTransfer {
  id: string;
  providerTransferId?: string;
  netAmount?: number;
  status: string;
  settlementId?: string;
  providerSettlementStatus?: string;
}

export function detectReconciliationMismatches(
  localTransfers: ReadonlyArray<LocalTransfer>,
  providerTransfers: ReadonlyArray<RouteTransferResult>,
  settlementEntries: ReadonlyArray<SettlementReconEntry>
): IReconciliationMismatch[] {
  const mismatches: IReconciliationMismatch[] = [];
  const providerById = new Map(
    providerTransfers.map((transfer) => [transfer.id, transfer])
  );
  const settlementByTransfer = new Map(
    settlementEntries.map((entry) => [entry.transferId, entry])
  );
  const expectedTransferStatuses = new Set([
    "pending_hold",
    "awaiting_settlement",
    "paid_out",
    "reversed",
    "disputed",
  ]);
  const localIds = new Set(
    localTransfers
      .map((transfer) => transfer.providerTransferId)
      .filter((id): id is string => Boolean(id))
  );

  for (const local of localTransfers) {
    if (!local.providerTransferId) {
      if (expectedTransferStatuses.has(local.status)) {
        mismatches.push({
          kind: "provider_transfer_missing",
          localTransferId: local.id,
          detail: "A local payout record has no provider transfer identifier.",
        });
      }
      continue;
    }

    const provider = providerById.get(local.providerTransferId);
    if (!provider) {
      mismatches.push({
        kind: "provider_transfer_missing",
        localTransferId: local.id,
        providerTransferId: local.providerTransferId,
        detail: "The provider transfer was not returned for this date range.",
      });
      continue;
    }

    if (
      local.netAmount !== undefined &&
      provider.amount !== undefined &&
      local.netAmount !== provider.amount
    ) {
      mismatches.push({
        kind: "transfer_status_mismatch",
        localTransferId: local.id,
        providerTransferId: provider.id,
        detail: "The local and provider transfer amounts differ.",
      });
    }

    const settlementEntry = settlementByTransfer.get(provider.id);
    if (provider.settlementStatus === "settled" && !settlementEntry?.settled) {
      mismatches.push({
        kind: "settlement_missing",
        localTransferId: local.id,
        providerTransferId: provider.id,
        settlementId: provider.settlementId,
        detail: "The settled transfer is missing from the settlement report.",
      });
    } else if (
      settlementEntry?.settlementId &&
      provider.settlementId &&
      settlementEntry.settlementId !== provider.settlementId
    ) {
      mismatches.push({
        kind: "settlement_missing",
        localTransferId: local.id,
        providerTransferId: provider.id,
        settlementId: settlementEntry.settlementId,
        detail: "The settlement identifiers do not match.",
      });
    }

    if (local.status === "pending_hold" && provider.settlementStatus !== "on_hold") {
      mismatches.push({
        kind: "transfer_status_mismatch",
        localTransferId: local.id,
        providerTransferId: provider.id,
        detail: "The local pending hold is not reflected by the provider.",
      });
    }
    if (local.status === "paid_out" && provider.settlementStatus !== "settled") {
      mismatches.push({
        kind: "transfer_status_mismatch",
        localTransferId: local.id,
        providerTransferId: provider.id,
        detail: "The local paid-out state is not reflected by the provider.",
      });
    }
  }

  for (const provider of providerTransfers) {
    if (!localIds.has(provider.id)) {
      mismatches.push({
        kind: "local_transfer_missing",
        providerTransferId: provider.id,
        detail: "A provider transfer has no matching local payout record.",
      });
    }
  }

  return mismatches;
}

export async function reconcileRouteTransfers(
  from: Date,
  to: Date,
  gateway: RouteGateway = createRouteGateway(),
  triggeredBy = "worker"
): Promise<{ reportId: string; mismatchCount: number }> {
  if (to <= from || to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000) {
    throw new Error("Reconciliation range must be positive and no longer than 31 days.");
  }
  await connectMongoose();

  const [localDocs, providerTransfers, settlementEntries] = await Promise.all([
    PayoutTransferModel.find({
      createdAt: { $gte: from, $lt: to },
    })
      .select({
        providerTransferId: 1,
        netAmount: 1,
        status: 1,
        settlementId: 1,
        providerSettlementStatus: 1,
      })
      .lean(),
    gateway.listTransfers(from, to),
    gateway.listSettlements(from, to),
  ]);
  const localTransfers = localDocs.map((transfer) => ({
    id: transfer._id.toString(),
    providerTransferId: transfer.providerTransferId,
    netAmount: transfer.netAmount,
    status: transfer.status,
    settlementId: transfer.settlementId,
    providerSettlementStatus: transfer.providerSettlementStatus,
  }));
  const mismatches = detectReconciliationMismatches(
    localTransfers,
    providerTransfers,
    settlementEntries
  );
  const runId = crypto
    .createHash("sha256")
    .update(`${from.toISOString()}:${to.toISOString()}`)
    .digest("hex");
  const report = await ReconciliationReportModel.findOneAndUpdate(
    { runId },
    {
      $setOnInsert: {
        runId,
        from,
        to,
        status: mismatches.length === 0 ? "clean" : "mismatch",
        mismatchCount: mismatches.length,
        mismatches,
      },
    },
    { upsert: true, new: true }
  );

  await AuditLogModel.updateOne(
    {
      action: "route_reconciliation_completed",
      targetCollection: "reconciliation_reports",
      targetId: report._id.toString(),
    },
    {
      $setOnInsert: {
        actorId: triggeredBy,
        actorRole: triggeredBy === "worker" ? "system" : "admin",
        action: "route_reconciliation_completed",
        targetCollection: "reconciliation_reports",
        targetId: report._id.toString(),
        before: null,
        after: {
          status: report.status,
          mismatchCount: report.mismatchCount,
          from,
          to,
        },
        timestamp: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    reportId: report._id.toString(),
    mismatchCount: report.mismatchCount,
  };
}
