import { connectMongoose } from "../src/server/db/mongoose";
import { TrackModel } from "../src/server/db/models/Track";
import {
  createPresignedDownloadUrl,
  createR2Client,
  deleteObject,
  generateStorageKey,
  publicBucketName,
} from "../src/server/storage/r2";
import { extractWaveformPeaks, generatePreviewMp3 } from "../src/server/audio/transcoder";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export interface TrackProcessorStorage {
  readPrivateObject(key: string, kind: "mp3" | "wav"): Promise<Buffer>;
  writePublicPreview(buffer: Buffer): Promise<string>;
  deletePrivateObject(key: string): Promise<void>;
}

const r2Storage: TrackProcessorStorage = {
  async readPrivateObject(key, kind) {
    const downloadUrl = await createPresignedDownloadUrl({
      key,
      downloadFilename: `source.${kind}`,
      expiresInSeconds: 300,
    });
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download source audio from R2: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  },
  async writePublicPreview(buffer) {
    const key = generateStorageKey("previews", "mp3");
    const client = createR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: publicBucketName,
        Key: key,
        Body: buffer,
        ContentType: "audio/mpeg",
      })
    );
    return key;
  },
  deletePrivateObject(key) {
    return deleteObject(key, false);
  },
};

export async function processTrackJob(
  trackId: string,
  storage: TrackProcessorStorage = r2Storage
): Promise<void> {
  await connectMongoose();
  const track = await TrackModel.findById(trackId);
  if (!track) {
    throw new Error(`Track ${trackId} not found.`);
  }

  track.processingStatus = "processing";
  await track.save();

  const sourceFile =
    track.files.find((file) => file.kind === "wav") ||
    track.files.find((file) => file.kind === "mp3");
  if (!sourceFile || (sourceFile.kind !== "mp3" && sourceFile.kind !== "wav")) {
    throw new Error("No valid MP3 or WAV audio source found on track.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "astrylix-transcode-"));
  const inputAudioPath = path.join(tempDir, `source-${sourceFile.kind}.${sourceFile.kind}`);
  const outputPreviewPath = path.join(tempDir, "preview.mp3");

  try {
    const buffer = await storage.readPrivateObject(sourceFile.r2Key, sourceFile.kind);

    if (sourceFile.checksum && sourceFile.checksum.length === 64) {
      const computedSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      if (computedSha256.toLowerCase() !== sourceFile.checksum.toLowerCase()) {
        await storage.deletePrivateObject(sourceFile.r2Key).catch(() => {});
        throw new Error(
          `Upload integrity verification failed: SHA-256 mismatch for ${sourceFile.kind}. Storage object deleted.`
        );
      }
    }

    await fs.writeFile(inputAudioPath, buffer);
    console.log(`[Astrylix Worker] Extracting 500 waveform peaks for track ${trackId}...`);
    const waveform = await extractWaveformPeaks(inputAudioPath, 500);
    console.log(`[Astrylix Worker] Generating 128 kbps preview MP3 for track ${trackId}...`);
    await generatePreviewMp3({
      inputAudioPath,
      outputMp3Path: outputPreviewPath,
      watermarkIntervalSeconds: 20,
    });

    const previewBuffer = await fs.readFile(outputPreviewPath);
    const previewKey = await storage.writePublicPreview(previewBuffer);

    track.files = track.files
      .filter((file) => file.kind !== "preview")
      .concat({
        kind: "preview",
        r2Key: previewKey,
        size: previewBuffer.length,
        checksum: previewKey,
        mimeType: "audio/mpeg",
      });
    track.waveform = waveform;
    track.processingStatus = "ready";
    track.processingError = null;
    track.status = "pending";
    await track.save();
    console.log(`[Astrylix Worker] Successfully processed track ${trackId} (${track.title}).`);
  } catch (error: unknown) {
    track.processingStatus = "failed";
    track.processingError = error instanceof Error ? error.message : "Processing failed";
    await track.save();
    throw error;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
