import dotenv from "dotenv";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

type SmokeStatus = "PASS" | "FAIL" | "BLOCKED";
const results: Array<{ name: string; status: SmokeStatus; detail: string }> = [];
const mark = (name: string, status: SmokeStatus, detail: string) => {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name}: ${detail}`);
};

function assertSafeEnvironment(): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run local smoke checks when NODE_ENV=production.");
  }
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri || uri === process.env.MONGODB_URI) {
    throw new Error("Set a separate MONGODB_TEST_URI. Production or shared app databases are not accepted.");
  }
  const database = decodeURIComponent(new URL(
    uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")
  ).pathname.slice(1));
  if (!/(^|[_-])test($|[_-])/i.test(database)) {
    throw new Error("MONGODB_TEST_URI must use a database name containing 'test'.");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const hostname = new URL(appUrl).hostname;
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
      throw new Error("Refusing to run against a non-local NEXT_PUBLIC_APP_URL.");
    }
  }
  return uri;
}

async function checkR2AndWorker(testUri: string): Promise<void> {
  const required = [
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_PUBLIC_BUCKET_NAME",
    "CLOUDFLARE_R2_PRIVATE_BUCKET_NAME",
  ];
  const missing = required.filter((key) => !process.env[key]);
  const publicBucket = process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME || "";
  const privateBucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME || "";
  if (missing.length || !/test/i.test(publicBucket) || !/test/i.test(privateBucket)) {
    const bucketIssues = [
      ...missing,
      ...(!/test/i.test(publicBucket) ? ["CLOUDFLARE_R2_PUBLIC_BUCKET_NAME (test bucket)"] : []),
      ...(!/test/i.test(privateBucket) ? ["CLOUDFLARE_R2_PRIVATE_BUCKET_NAME (test bucket)"] : []),
    ];
    mark(
      "R2 upload",
      "BLOCKED",
      `Set ${bucketIssues.join(", ")}.`
    );
    mark("Worker processing", "BLOCKED", "Requires a successful R2 upload and configured test buckets.");
    return;
  }

  const originalUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = testUri;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "beatbazaar-smoke-"));
  let trackId: string | undefined;
  let sourceKey: string | undefined;
  let previewKey: string | undefined;
  let client: import("@aws-sdk/client-s3").S3Client | undefined;
  let connectMongoose: typeof import("../src/server/db/mongoose").connectMongoose | undefined;
  let TrackModel: typeof import("../src/server/db/models/Track").TrackModel | undefined;
  let r2UploadPassed = false;
  const cleanupErrors: string[] = [];

  try {
    const [{ connectMongoose: connect }, { TrackModel: Track }, storage, s3Commands, worker] =
      await Promise.all([
        import("../src/server/db/mongoose"),
        import("../src/server/db/models/Track"),
        import("../src/server/storage/r2"),
        import("@aws-sdk/client-s3"),
        import("../worker/track-processor"),
      ]);
    connectMongoose = connect;
    TrackModel = Track;
    client = storage.createR2Client();
    await connect();

    const audioPath = path.join(tempDir, "smoke-source.wav");
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-t",
      "2",
      "-c:a",
      "pcm_s16le",
      audioPath,
    ]);
    const audio = await fs.readFile(audioPath);
    sourceKey = storage.generateStorageKey("originals", "wav");
    await client.send(
      new s3Commands.PutObjectCommand({
        Bucket: storage.privateBucketName,
        Key: sourceKey,
        Body: audio,
        ContentType: "audio/wav",
      })
    );
    const sourceHead = await client.send(
      new s3Commands.HeadObjectCommand({
        Bucket: storage.privateBucketName,
        Key: sourceKey,
      })
    );
    if (sourceHead.ContentLength !== audio.length) {
      throw new Error("Uploaded source size did not match the test audio.");
    }
    mark("R2 upload", "PASS", `Uploaded ${audio.length} bytes to the configured private test bucket.`);
    r2UploadPassed = true;

    const track = await Track.create({
      producerId: `smoke-${crypto.randomUUID()}`,
      title: "Local worker smoke test",
      slug: `local-worker-smoke-${crypto.randomUUID()}`,
      genre: "Test",
      bpm: 100,
      key: "C",
      status: "draft",
      processingStatus: "queued",
      files: [{
        kind: "wav",
        r2Key: sourceKey,
        size: audio.length,
        checksum: crypto.createHash("sha256").update(audio).digest("hex"),
        mimeType: "audio/wav",
      }],
      licenses: [],
    });
    trackId = track._id.toString();
    await worker.processTrackJob(trackId);

    const processed = await Track.findById(trackId).lean();
    const preview = processed?.files.find((file) => file.kind === "preview");
    if (
      processed?.processingStatus !== "ready" ||
      processed.status !== "pending" ||
      processed.waveform.length !== 500 ||
      !preview
    ) {
      throw new Error("Worker did not persist a ready preview, waveform, and moderation state.");
    }
    previewKey = preview.r2Key;
    const previewHead = await client.send(
      new s3Commands.HeadObjectCommand({
        Bucket: storage.publicBucketName,
        Key: previewKey,
      })
    );
    if (!previewHead.ContentLength) {
      throw new Error("Worker preview is missing from the configured public test bucket.");
    }
    mark(
      "Worker processing",
      "PASS",
      `Generated a ${previewHead.ContentLength}-byte preview and ${processed.waveform.length} waveform peaks.`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown local smoke failure.";
    if (r2UploadPassed) {
      mark("Worker processing", "FAIL", message);
    } else {
      mark("R2 upload", "FAIL", message);
      mark("Worker processing", "BLOCKED", "Requires a successful R2 upload.");
    }
  } finally {
    if (client && process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME && sourceKey) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME,
        Key: sourceKey,
      })).catch((error: unknown) => cleanupErrors.push(error instanceof Error ? error.message : "Private object cleanup failed."));
    }
    if (client && process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME && previewKey) {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(new DeleteObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME,
        Key: previewKey,
      })).catch((error: unknown) => cleanupErrors.push(error instanceof Error ? error.message : "Preview cleanup failed."));
    }
    if (trackId && TrackModel && connectMongoose) {
      await connectMongoose().then(() => TrackModel?.deleteOne({ _id: trackId })).catch((error: unknown) =>
        cleanupErrors.push(error instanceof Error ? error.message : "Test track cleanup failed.")
      );
    }
    client?.destroy();
    await fs.rm(tempDir, { recursive: true, force: true }).catch((error: unknown) =>
      cleanupErrors.push(error instanceof Error ? error.message : "Temporary audio cleanup failed.")
    );
    mark(
      "Smoke cleanup",
      cleanupErrors.length ? "FAIL" : "PASS",
      cleanupErrors.length ? cleanupErrors.join(" | ") : "Temporary objects and test data were removed."
    );
    if (originalUri) process.env.MONGODB_URI = originalUri;
    else delete process.env.MONGODB_URI;
  }
}

async function checkRazorpayTestCheckout(): Promise<void> {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!keyId.startsWith("rzp_test_") || !keySecret) {
    mark("Razorpay test checkout", "BLOCKED", "Set RAZORPAY_KEY_ID to an rzp_test_ key and set RAZORPAY_KEY_SECRET.");
    return;
  }
  try {
    const { RazorpayProvider } = await import("../src/server/payments/razorpay");
    const result = await new RazorpayProvider().createCheckout({
      internalOrderId: crypto.randomUUID(),
      currency: "INR",
      amountMinorUnits: 100,
      receiptId: `smoke_${Date.now()}`,
      returnUrl: "http://localhost:3000/orders",
    });
    if (!result.providerOrderId.startsWith("order_")) {
      throw new Error("Razorpay returned an unexpected test order identifier.");
    }
    mark(
      "Razorpay test checkout",
      "PASS",
      `Created test order ${result.providerOrderId}. No payment was captured.`
    );
  } catch (error: unknown) {
    mark(
      "Razorpay test checkout",
      "FAIL",
      error instanceof Error ? error.message : "Unknown Razorpay test API failure."
    );
  }
}

let testUri: string | undefined;
try {
  testUri = assertSafeEnvironment();
} catch (error: unknown) {
  console.error(`[FAIL] Environment safety: ${error instanceof Error ? error.message : "Invalid setup."}`);
  process.exitCode = 1;
}

if (testUri) {
  await Promise.all([checkR2AndWorker(testUri), checkRazorpayTestCheckout()]);
}

const failed = results.filter((result) => result.status === "FAIL").length;
const blocked = results.filter((result) => result.status === "BLOCKED").length;
console.log(`Smoke summary: ${results.length - failed - blocked} passed, ${failed} failed, ${blocked} blocked.`);
if (failed || blocked || !testUri) process.exitCode = 1;
