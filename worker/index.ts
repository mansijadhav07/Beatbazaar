import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { connectMongoose } from "../src/server/db/mongoose";
import { TrackModel } from "../src/server/db/models/Track";
import { claimNextJob, completeJob, failJob, reclaimStaleJobs } from "../src/server/jobs/queue";
import { cleanupAbandonedDrafts } from "../src/server/jobs/cleanup-drafts";
import { flushBufferedPlays } from "../src/server/jobs/flush-plays";
import {
  processAwaitingKycTransfers,
  processCoolingPayoutTransfers,
  processFeePendingPayouts,
} from "../src/server/payouts/transfers";
import { reconcileRouteTransfers } from "../src/server/payouts/reconciliation";
import { generateStorageKey, createPresignedDownloadUrl, createR2Client, publicBucketName, deleteObject } from "../src/server/storage/r2";
import { extractWaveformPeaks, generatePreviewMp3 } from "../src/server/audio/transcoder";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const WORKER_ID = `worker-${process.pid}-${Date.now().toString(36)}`;
let isRunning = true;

console.log(`[Beatbazaar Worker] Starting background worker runtime (${WORKER_ID})...`);

// Stream object from R2 and compute whole-file SHA-256
async function verifyObjectSha256(key: string, expectedHexSha256: string): Promise<boolean> {
  const s3 = createR2Client();
  const getCmd = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME || "beatbazaar-private",
    Key: key,
  });

  const res = await s3.send(getCmd);
  if (!res.Body) return false;

  const hash = crypto.createHash("sha256");
  const stream = res.Body as NodeJS.ReadableStream;

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => {
      const computed = hash.digest("hex");
      const matches = computed.toLowerCase() === expectedHexSha256.toLowerCase();
      resolve(matches);
    });
    stream.on("error", (err) => reject(err));
  });
}

async function processTrackJob(trackId: string): Promise<void> {
  await connectMongoose();
  const track = await TrackModel.findById(trackId);
  if (!track) {
    throw new Error(`Track ${trackId} not found.`);
  }

  track.processingStatus = "processing";
  await track.save();

  // Pick audio source file (prefer WAV for highest fidelity transcode, fallback to MP3)
  const sourceFile = track.files.find((f) => f.kind === "wav") || track.files.find((f) => f.kind === "mp3");
  if (!sourceFile) {
    throw new Error("No valid MP3 or WAV audio source found on track.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "beatbazaar-transcode-"));
  const inputAudioPath = path.join(tempDir, `source-${sourceFile.kind}.${sourceFile.kind}`);
  const outputPreviewPath = path.join(tempDir, "preview.mp3");

  try {
    // 1. Download source audio from private R2
    const downloadUrl = await createPresignedDownloadUrl({
      key: sourceFile.r2Key,
      downloadFilename: `source.${sourceFile.kind}`,
      expiresInSeconds: 300,
    });

    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Failed to download source audio from R2: ${res.statusText}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    // Verify SHA-256 integrity if client supplied checksum
    if (sourceFile.checksum && sourceFile.checksum.length === 64) {
      const computedSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      if (computedSha256.toLowerCase() !== sourceFile.checksum.toLowerCase()) {
        await deleteObject(sourceFile.r2Key, false).catch(() => {});
        throw new Error(`Upload integrity verification failed: SHA-256 mismatch for ${sourceFile.kind}. Storage object deleted.`);
      }
    }

    await fs.writeFile(inputAudioPath, buffer);

    // 2. Extract 500 waveform peaks
    console.log(`[Beatbazaar Worker] Extracting 500 waveform peaks for track ${trackId}...`);
    const waveform = await extractWaveformPeaks(inputAudioPath, 500);

    // 3. Generate watermarked preview MP3 at 128 kbps
    console.log(`[Beatbazaar Worker] Generating 128 kbps preview MP3 for track ${trackId}...`);
    await generatePreviewMp3({
      inputAudioPath,
      outputMp3Path: outputPreviewPath,
      watermarkIntervalSeconds: 20,
    });

    // 4. Upload generated preview to public bucket in R2
    const previewBuffer = await fs.readFile(outputPreviewPath);
    const previewKey = generateStorageKey("previews", "mp3");
    const s3 = createR2Client();

    await s3.send(
      new PutObjectCommand({
        Bucket: publicBucketName,
        Key: previewKey,
        Body: previewBuffer,
        ContentType: "audio/mpeg",
      })
    );

    // 5. Update Track document with preview file and waveform
    const previewFileEntry = {
      kind: "preview" as const,
      r2Key: previewKey,
      size: previewBuffer.length,
      checksum: previewKey,
      mimeType: "audio/mpeg",
    };

    // Filter out old preview if any, append new preview
    track.files = track.files.filter((f) => f.kind !== "preview").concat(previewFileEntry);
    track.waveform = waveform;
    track.processingStatus = "ready";
    track.processingError = null;
    track.status = "pending"; // Pending review by admin before live
    await track.save();

    console.log(`[Beatbazaar Worker] Successfully processed track ${trackId} (${track.title}).`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Processing failed";
    track.processingStatus = "failed";
    track.processingError = errorMsg;
    await track.save();
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Scheduled timers with error boundary protection
// 1. Reclaim stale jobs every 60 seconds
setInterval(async () => {
  try {
    const res = await reclaimStaleJobs(5 * 60 * 1000);
    if (res.reclaimedCount > 0) {
      console.log(`[Beatbazaar Worker Timer] Reclaimed ${res.reclaimedCount} stale job(s).`);
    }
  } catch (err: unknown) {
    console.error("[Beatbazaar Worker Timer] Error during stale job reclaim:", err);
  }
}, 60 * 1000);

// 2. Cleanup abandoned drafts every 1 hour
setInterval(async () => {
  try {
    const res = await cleanupAbandonedDrafts();
    if (res.deletedCount > 0) {
      console.log(`[Beatbazaar Worker Timer] Cleaned up ${res.deletedCount} abandoned draft(s).`);
    }
  } catch (err: unknown) {
    console.error("[Beatbazaar Worker Timer] Error during draft cleanup:", err);
  }
}, 60 * 60 * 1000);

// 3. Flush buffered play event counters every 30 seconds
setInterval(async () => {
  try {
    const res = await flushBufferedPlays();
    if (res.flushedTracks > 0) {
      console.log(`[Beatbazaar Worker Timer] Flushed play counts for ${res.flushedTracks} track(s).`);
    }
  } catch (err: unknown) {
    console.error("[Beatbazaar Worker Timer] Error during play flush:", err);
  }
}, 30 * 1000);

async function reconcilePreviousUtcDay(): Promise<void> {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  const result = await reconcileRouteTransfers(from, to);
  console.log(
    `[Beatbazaar Worker] Route reconciliation completed with ${result.mismatchCount} mismatch(es).`
  );
}

setInterval(async () => {
  try {
    await processFeePendingPayouts();
    await processCoolingPayoutTransfers();
  } catch (err: unknown) {
    console.error(
      "[Beatbazaar Worker Timer] Pending payout processing failed.",
      err instanceof Error ? err.name : "UnknownError"
    );
  }
}, 30 * 60 * 1000);

setInterval(async () => {
  try {
    await reconcilePreviousUtcDay();
  } catch (err: unknown) {
    console.error(
      "[Beatbazaar Worker Timer] Route reconciliation failed.",
      err instanceof Error ? err.name : "UnknownError"
    );
  }
}, 24 * 60 * 60 * 1000);

void reconcilePreviousUtcDay().catch((err: unknown) => {
  console.error(
    "[Beatbazaar Worker] Initial Route reconciliation failed.",
    err instanceof Error ? err.name : "UnknownError"
  );
});

async function loop() {
  while (isRunning) {
    try {
      const job = await claimNextJob(WORKER_ID);
      if (job) {
        console.log(`[Beatbazaar Worker] Processing job ${job._id} (type: ${job.type})...`);
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
          console.error(`[Beatbazaar Worker] Job ${job._id} failed:`, errorMsg);
          await failJob(job._id.toString(), errorMsg);
        }
      } else {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err: unknown) {
      console.error("[Beatbazaar Worker] Main loop error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop();

function handleShutdown(signal: string) {
  console.log(`[Beatbazaar Worker] Received ${signal}. Shutting down worker gracefully...`);
  isRunning = false;
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
