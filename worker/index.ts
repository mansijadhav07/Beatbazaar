import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { claimNextJob, completeJob, failJob, reclaimStaleJobs } from "../src/server/jobs/queue";
import { cleanupAbandonedDrafts } from "../src/server/jobs/cleanup-drafts";
import { flushBufferedPlays } from "../src/server/jobs/flush-plays";
import {
  processAwaitingKycTransfers,
  processCoolingPayoutTransfers,
  processFeePendingPayouts,
} from "../src/server/payouts/transfers";
import { reconcileRouteTransfers } from "../src/server/payouts/reconciliation";
import { processTrackJob } from "./track-processor";

const WORKER_ID = `worker-${process.pid}-${Date.now().toString(36)}`;
let isRunning = true;

console.log(`[Astrylix Worker] Starting background worker runtime (${WORKER_ID})...`);

// Scheduled timers with error boundary protection
// 1. Reclaim stale jobs every 60 seconds
setInterval(async () => {
  try {
    const res = await reclaimStaleJobs(5 * 60 * 1000);
    if (res.reclaimedCount > 0) {
      console.log(`[Astrylix Worker Timer] Reclaimed ${res.reclaimedCount} stale job(s).`);
    }
  } catch (err: unknown) {
    console.error("[Astrylix Worker Timer] Error during stale job reclaim:", err);
  }
}, 60 * 1000);

// 2. Cleanup abandoned drafts every 1 hour
setInterval(async () => {
  try {
    const res = await cleanupAbandonedDrafts();
    if (res.deletedCount > 0) {
      console.log(`[Astrylix Worker Timer] Cleaned up ${res.deletedCount} abandoned draft(s).`);
    }
  } catch (err: unknown) {
    console.error("[Astrylix Worker Timer] Error during draft cleanup:", err);
  }
}, 60 * 60 * 1000);

// 3. Flush buffered play event counters every 30 seconds
setInterval(async () => {
  try {
    const res = await flushBufferedPlays();
    if (res.flushedTracks > 0) {
      console.log(`[Astrylix Worker Timer] Flushed play counts for ${res.flushedTracks} track(s).`);
    }
  } catch (err: unknown) {
    console.error("[Astrylix Worker Timer] Error during play flush:", err);
  }
}, 30 * 1000);

async function reconcilePreviousUtcDay(): Promise<void> {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const result = await reconcileRouteTransfers(from, to);
  console.log(
    `[Astrylix Worker] Route reconciliation completed with ${result.mismatchCount} mismatch(es).`
  );
}

setInterval(async () => {
  try {
    await processFeePendingPayouts();
    await processCoolingPayoutTransfers();
  } catch (err: unknown) {
    console.error(
      "[Astrylix Worker Timer] Pending payout processing failed.",
      err instanceof Error ? err.name : "UnknownError"
    );
  }
}, 30 * 60 * 1000);

setInterval(async () => {
  try {
    await reconcilePreviousUtcDay();
  } catch (err: unknown) {
    console.error(
      "[Astrylix Worker Timer] Route reconciliation failed.",
      err instanceof Error ? err.name : "UnknownError"
    );
  }
}, 24 * 60 * 60 * 1000);

void reconcilePreviousUtcDay().catch((err: unknown) => {
  console.error(
    "[Astrylix Worker] Initial Route reconciliation failed.",
    err instanceof Error ? err.name : "UnknownError"
  );
});

async function loop() {
  while (isRunning) {
    try {
      const job = await claimNextJob(WORKER_ID);
      if (job) {
        console.log(`[Astrylix Worker] Processing job ${job._id} (type: ${job.type})...`);
        try {
          if (job.type === "process-track") {
            await processTrackJob(job.payload.trackId);
          } else if (job.type === "process-producer-payouts") {
            if (typeof job.payload.producerId !== "string") {
              throw new Error("Payout job is missing its producer identifier.");
            }
            await processAwaitingKycTransfers(job.payload.producerId);
          }
          await completeJob(job._id.toString());
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : "Job failure";
          console.error(`[Astrylix Worker] Job ${job._id} failed:`, errorMsg);
          await failJob(job._id.toString(), errorMsg);
        }
      } else {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err: unknown) {
      console.error("[Astrylix Worker] Main loop error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop();

function handleShutdown(signal: string) {
  console.log(`[Astrylix Worker] Received ${signal}. Shutting down worker gracefully...`);
  isRunning = false;
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
