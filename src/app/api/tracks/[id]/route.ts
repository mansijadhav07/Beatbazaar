import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import { enqueueJob } from "@/server/jobs/queue";
import { deleteObject } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

/**
 * DELETE: Delete a track. Requires naming confirmation or draft state.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const session = await requireRole(["producer", "admin"]);
    const producerId = session.user.id;

    await connectMongoose();
    const track = await TrackModel.findOne({ _id: trackId, producerId });
    if (!track) {
      return NextResponse.json({ error: "Beat not found." }, { status: 404 });
    }

    // Delete associated storage files from R2
    for (const f of track.files) {
      const isPublic = f.kind === "preview";
      await deleteObject(f.r2Key, isPublic).catch(() => {});
    }
    if (track.coverKey) {
      await deleteObject(track.coverKey, true).catch(() => {});
    }

    await TrackModel.deleteOne({ _id: trackId });
    return NextResponse.json({ success: true, message: `Beat "${track.title}" deleted.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete operation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Retry processing for a failed track.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;
    const session = await requireRole(["producer", "admin"]);
    const producerId = session.user.id;

    await connectMongoose();
    const track = await TrackModel.findOne({ _id: trackId, producerId });
    if (!track) {
      return NextResponse.json({ error: "Beat not found." }, { status: 404 });
    }

    if (track.processingStatus !== "failed") {
      return NextResponse.json({ error: "Track is not in failed processing state." }, { status: 400 });
    }

    track.processingStatus = "queued";
    track.processingError = null;
    await track.save();

    await enqueueJob("process-track", { trackId: track._id.toString() });

    return NextResponse.json({ success: true, message: "Processing retry queued." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Retry operation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

