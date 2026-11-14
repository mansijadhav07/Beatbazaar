import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { consumeAdminStepUpToken, isSameOriginRequest } from "@/server/admin/step-up";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { ReportModel } from "@/server/db/models/Report";
import { TrackModel } from "@/server/db/models/Track";
import { connectMongoose } from "@/server/db/mongoose";
import { revalidatePublicTrack } from "@/server/catalog/revalidation";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  status: z.enum(["in_review", "resolved", "dismissed"]),
  adminNote: z.string().trim().min(3).max(2000),
  takeDown: z.boolean().optional(),
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
    return NextResponse.json({ error: "A valid report decision and note are required." }, { status: 400 });
  }
  const sessionContext = await requireRole(["admin"]);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid report ID." }, { status: 400 });
  }
  await consumeAdminStepUpToken({
    request,
    session: sessionContext,
    action: "report_update",
    targetId: id,
  });
  await connectMongoose();
  const mongoSession = await mongoose.startSession();
  const removedTracks: Array<{ id: string; slug: string }> = [];
  try {
    await mongoSession.withTransaction(async () => {
      const current = await ReportModel.findOne({
        _id: id,
        status: { $in: ["open", "in_review"] },
      })
        .session(mongoSession)
        .lean();
      if (!current) throw new Error("This report is already closed or does not exist.");
      if (current.status !== "open" && parsed.data.status === "in_review") {
        throw new Error("Only an open report can be moved into review.");
      }
      if (parsed.data.takeDown && parsed.data.status !== "resolved") {
        throw new Error("A beat takedown must resolve the report.");
      }

      if (parsed.data.takeDown) {
        const track = await TrackModel.findById(current.trackId)
          .session(mongoSession)
          .lean();
        if (!track || !["live", "sold_exclusive"].includes(track.status)) {
          throw new Error("This beat is no longer available for takedown.");
        }
        removedTracks.push({ id: track._id.toString(), slug: track.slug });
        const trackUpdate = await TrackModel.updateOne(
          { _id: current.trackId, status: track.status },
          { $set: { status: "removed", featured: false } },
          { session: mongoSession }
        );
        if (trackUpdate.modifiedCount !== 1) {
          throw new Error("This beat changed during takedown. Refresh and try again.");
        }
        await AuditLogModel.create(
          [
            {
              actorId: sessionContext.user.id,
              actorRole: "admin",
              action: "track_removed_after_report",
              targetCollection: "tracks",
              targetId: current.trackId.toString(),
              before: { status: track.status, featured: track.featured },
              after: { status: "removed", featured: false, reportId: id },
              timestamp: new Date(),
            },
          ],
          { session: mongoSession }
        );
      }

      const result = await ReportModel.updateOne(
        { _id: id, status: current.status },
        {
          $set: {
            status: parsed.data.status,
            adminNote: parsed.data.adminNote,
            resolvedBy:
              parsed.data.status === "resolved" || parsed.data.status === "dismissed"
                ? sessionContext.user.id
                : undefined,
            resolvedAt:
              parsed.data.status === "resolved" || parsed.data.status === "dismissed"
                ? new Date()
                : null,
          },
        },
        { session: mongoSession }
      );
      if (result.modifiedCount !== 1) {
        throw new Error("This report changed during review. Refresh and try again.");
      }
      await AuditLogModel.create(
        [
          {
            actorId: sessionContext.user.id,
            actorRole: "admin",
            action: `report_${parsed.data.status}`,
            targetCollection: "reports",
            targetId: id,
            before: { status: current.status },
            after: {
              status: parsed.data.status,
              adminNote: parsed.data.adminNote,
              takeDown: parsed.data.takeDown === true,
            },
            timestamp: new Date(),
          },
        ],
        { session: mongoSession }
      );
    });
    for (const track of removedTracks) {
      revalidatePublicTrack(track.id, track.slug);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report update failed." },
      { status: 409 }
    );
  } finally {
    await mongoSession.endSession();
  }
}
