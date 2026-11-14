import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import {
  generateStorageKey,
  createPresignedUploadUrl,
  startMultipartUpload,
  getPresignedPartUrl,
} from "@/server/storage/r2";
import {
  isUploadMimeTypeAllowed,
  MAX_UPLOAD_BYTES,
  type UploadFileKind,
} from "@/lib/upload-files";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MAX_PENDING_DRAFTS_PER_PRODUCER = 10;

const RequestUploadSchema = z.object({
  trackId: z.string().optional(),
  title: z.string().min(1).max(100).optional(),
  genre: z.string().min(1).max(50).optional(),
  bpm: z.number().int().min(40).max(280).optional(),
  key: z.string().max(10).optional(),
  files: z.array(
    z.object({
      kind: z.enum(["mp3", "wav", "stems", "cover"]),
      fileName: z.string(),
      contentType: z.string(),
      size: z.number().int().positive(),
      checksumSha256: z.string().optional(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const sessionContext = await requireRole(["producer", "admin"], {
      requireVerifiedEmail: true,
    });
    const producerId = sessionContext.user.id;

    const body = await request.json();
    const parsed = RequestUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    for (const file of parsed.data.files) {
      const kind = file.kind as UploadFileKind;
      if (file.size > MAX_UPLOAD_BYTES[kind]) {
        return NextResponse.json(
          { error: `${file.kind} exceeds the maximum upload size.` },
          { status: 413 }
        );
      }
      if (!isUploadMimeTypeAllowed(kind, file.contentType)) {
        return NextResponse.json(
          { error: `Unsupported content type for ${file.kind}.` },
          { status: 400 }
        );
      }
    }

    await connectMongoose();

    // Check rate limit / pending draft cap
    const activeDraftCount = await TrackModel.countDocuments({
      producerId,
      status: "draft",
    });

    if (activeDraftCount >= MAX_PENDING_DRAFTS_PER_PRODUCER && !parsed.data.trackId) {
      return NextResponse.json(
        {
          error: `You have reached the limit of ${MAX_PENDING_DRAFTS_PER_PRODUCER} unsubmitted drafts. Please complete or delete existing drafts before starting a new beat.`,
        },
        { status: 429 }
      );
    }

    // Upsert or create draft track
    let track;
    if (parsed.data.trackId) {
      track = await TrackModel.findOne({ _id: parsed.data.trackId, producerId: String(producerId) });
      if (!track) {
        return NextResponse.json({ error: "Draft beat not found." }, { status: 404 });
      }
    } else {
      const title = parsed.data.title || "Untitled Beat";
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
      track = await TrackModel.create({
        producerId: String(producerId),
        title,
        slug,
        genre: parsed.data.genre || "Trap",
        bpm: parsed.data.bpm || 140,
        key: parsed.data.key || "C Minor",
        status: "draft",
        processingStatus: "ready",
      });
    }

    const uploadUrls: Record<string, any> = {};

    for (const f of parsed.data.files) {
      const ext = f.fileName.split(".").pop() || "";
      const isPublic = f.kind === "cover";
      const category = f.kind === "cover" ? "covers" : f.kind === "stems" ? "stems" : "originals";
      const storageKey = generateStorageKey(category, ext);

      // Use multipart for files > 50MB (e.g. WAV, stems)
      if (f.size > 50 * 1024 * 1024) {
        const uploadId = await startMultipartUpload(storageKey, f.contentType, isPublic);
        const partSize = 10 * 1024 * 1024; // 10MB parts
        const numParts = Math.ceil(f.size / partSize);
        const partUrls: Array<{ partNumber: number; url: string }> = [];

        for (let i = 1; i <= numParts; i++) {
          const url = await getPresignedPartUrl(storageKey, uploadId, i, isPublic);
          partUrls.push({ partNumber: i, url });
        }

        uploadUrls[f.kind] = {
          mode: "multipart",
          uploadId,
          key: storageKey,
          parts: partUrls,
        };
      } else {
        const { uploadUrl } = await createPresignedUploadUrl({
          key: storageKey,
          contentType: f.contentType,
          contentLength: f.size,
          checksumSha256: f.checksumSha256,
          isPublic,
        });

        uploadUrls[f.kind] = {
          mode: "single",
          uploadUrl,
          key: storageKey,
        };
      }
    }

    return NextResponse.json({
      trackId: track._id.toString(),
      uploadUrls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload authorization failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
