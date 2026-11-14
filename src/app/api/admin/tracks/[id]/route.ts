import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { consumeAdminStepUpToken, isSameOriginRequest } from "@/server/admin/step-up";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { TrackModel } from "@/server/db/models/Track";
import { connectMongoose } from "@/server/db/mongoose";
import { revalidatePublicTrack } from "@/server/catalog/revalidation";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  status: z.enum(["live", "rejected"]),
  reason: z.string().trim().min(3).max(500),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid moderation decision is required." }, { status: 400 });
  }
  const sessionContext = await requireRole(["admin"]);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid beat ID." }, { status: 400 });
  }
  await consumeAdminStepUpToken({
    request,
    session: sessionContext,
    action: "track_moderate",
    targetId: id,
  });
  await connectMongoose();
  const mongoSession = await mongoose.startSession();
  try {
    let updated = false;
    let updatedSlug: string | undefined;
    await mongoSession.withTransaction(async () => {
      const current = await TrackModel.findOne({
        _id: id,
        status: "pending",
      })
        .session(mongoSession)
        .lean();
      if (!current) throw new Error("This beat is no longer awaiting moderation.");
      updatedSlug = current.slug;
      if (
        parsed.data.status === "live" &&
        (current.processingStatus !== "ready" ||
          !current.rightsConfirmedAt ||
          !current.files.some((file) => file.kind === "preview"))
      ) {
        throw new Error("This beat is not ready for publication.");
      }

      const result = await TrackModel.updateOne(
        { _id: id, status: "pending" },
        { $set: { status: parsed.data.status, featured: false } },
        { session: mongoSession }
      );
      if (result.modifiedCount !== 1) {
        throw new Error("This beat changed during moderation. Refresh and try again.");
      }

      await AuditLogModel.create(
        [
          {
            actorId: sessionContext.user.id,
            actorRole: "admin",
            action: parsed.data.status === "live" ? "track_approved" : "track_rejected",
            targetCollection: "tracks",
            targetId: id,
            before: { status: current.status },
            after: { status: parsed.data.status, reason: parsed.data.reason },
            timestamp: new Date(),
          },
        ],
        { session: mongoSession }
      );
      updated = true;
    });

    if (!updated) {
      return NextResponse.json({ error: "The moderation change was not saved." }, { status: 409 });
    }
    revalidatePublicTrack(id, updatedSlug);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Moderation failed." },
      { status: 409 }
    );
  } finally {
    await mongoSession.endSession();
  }
}
