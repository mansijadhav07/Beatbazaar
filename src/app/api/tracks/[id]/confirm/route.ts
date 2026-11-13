import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import {
  finishMultipartUpload,
  headObject,
  getFirstBytes,
  deleteObject,
} from "@/server/storage/r2";
import { sniffFileType, scanFile } from "@/server/storage/sniffer";
import { enqueueJob } from "@/server/jobs/queue";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ConfirmUploadSchema = z.object({
  title: z.string().min(1).max(100),
  genre: z.string().min(1).max(50),
  bpm: z.number().int().min(40).max(280),
  key: z.string().max(10),
  moods: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  language: z.string().default("Instrumental"),
  rightsConfirmed: z.boolean(),
  cover: z.object({
    key: z.string(),
    size: z.number().int().positive(),
    contentType: z.string(),
  }).optional(),
  files: z.array(
    z.object({
      kind: z.enum(["mp3", "wav", "stems"]),
      key: z.string(),
      size: z.number().int().positive(),
      contentType: z.string(),
      mode: z.enum(["single", "multipart"]).default("single"),
      uploadId: z.string().optional(),
      parts: z.array(z.object({ PartNumber: z.number(), ETag: z.string() })).optional(),
    })
  ).min(1),
  licenses: z.array(
    z.object({
      tier: z.enum(["free", "non_exclusive", "exclusive"]),
      name: z.string(),
      price: z.object({
        amount: z.number().int().nonnegative(),
        currency: z.enum(["INR", "USD"]),
      }),
      includedFiles: z.array(z.enum(["preview", "mp3", "wav", "stems"])),
      termsVersion: z.string().default("1.0"),
      enabled: z.boolean().default(true),
    })
  ).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const session = await requireRole(["producer", "admin"], {
      requireVerifiedEmail: true,
    });
    const producerId = session.user.id;

    const body = await request.json();
    const parsed = ConfirmUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    if (!parsed.data.rightsConfirmed) {
      return NextResponse.json(
        { error: "You must confirm you hold all legal rights to this audio before publishing." },
        { status: 400 }
      );
    }

    await connectMongoose();
    const track = await TrackModel.findOne({ _id: trackId, producerId });
    if (!track) {
      return NextResponse.json({ error: "Draft beat not found." }, { status: 404 });
    }

    // Process multipart completions and verify uploaded objects via HEAD and magic byte sniffing
    const confirmedFiles: Array<{
      kind: "mp3" | "wav" | "stems";
      r2Key: string;
      size: number;
      checksum: string;
      mimeType: string;
    }> = [];

    for (const f of parsed.data.files) {
      if (f.mode === "multipart" && f.uploadId && f.parts) {
        await finishMultipartUpload(f.key, f.uploadId, f.parts, false);
      }

      // Verify object exists in R2
      const head = await headObject(f.key, false);
      if (!head) {
        await deleteObject(f.key, false).catch(() => {});
        return NextResponse.json(
          { error: `Upload verification failed for ${f.kind}: file was not found in storage.` },
          { status: 400 }
        );
      }

      // First-bytes file type sniffing
      const headerBytes = await getFirstBytes(f.key, 32, false);
      if (!headerBytes) {
        await deleteObject(f.key, false).catch(() => {});
        return NextResponse.json(
          { error: `Could not verify contents for ${f.kind}. Object deleted for security.` },
          { status: 400 }
        );
      }

      const sniffed = sniffFileType(headerBytes);
      if (!sniffed) {
        await deleteObject(f.key, false).catch(() => {});
        return NextResponse.json(
          { error: `File type verification failed: ${f.kind} does not match expected audio/archive binary signatures.` },
          { status: 400 }
        );
      }

      // Scan file interface hook
      const scanResult = await scanFile(f.key);
      if (!scanResult.clean) {
        await deleteObject(f.key, false).catch(() => {});
        return NextResponse.json(
          { error: `Security scan rejected ${f.kind}: suspicious content detected.` },
          { status: 400 }
        );
      }

      confirmedFiles.push({
        kind: f.kind,
        r2Key: f.key,
        size: head.size,
        checksum: head.etag.replace(/"/g, ""),
        mimeType: sniffed.mimeType,
      });
    }

    // Verify cover art if supplied
    let coverKey: string | null = null;
    if (parsed.data.cover) {
      const coverHead = await headObject(parsed.data.cover.key, true);
      if (coverHead) {
        const coverBytes = await getFirstBytes(parsed.data.cover.key, 32, true);
        const coverSniffed = coverBytes ? sniffFileType(coverBytes) : null;
        if (coverSniffed && coverSniffed.mimeType.startsWith("image/")) {
          coverKey = parsed.data.cover.key;
        } else {
          await deleteObject(parsed.data.cover.key, true).catch(() => {});
        }
      }
    }

    // Update track with finalized metadata and queued status
    track.title = parsed.data.title;
    track.genre = parsed.data.genre;
    track.bpm = parsed.data.bpm;
    track.key = parsed.data.key;
    track.moods = parsed.data.moods;
    track.tags = parsed.data.tags;
    track.language = parsed.data.language;
    track.files = confirmedFiles;
    track.licenses = parsed.data.licenses;
    track.coverKey = coverKey;
    track.rightsConfirmedAt = new Date();
    track.status = "pending";
    track.processingStatus = "queued";
    await track.save();

    // Enqueue transcoding job
    await enqueueJob("process-track", { trackId: track._id.toString() });

    return NextResponse.json({
      success: true,
      trackId: track._id.toString(),
      status: track.status,
      processingStatus: track.processingStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Confirmation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

