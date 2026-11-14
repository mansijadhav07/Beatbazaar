import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth/guards";
import { consumeAdminStepUpToken, isSameOriginRequest } from "@/server/admin/step-up";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { TrackModel } from "@/server/db/models/Track";
import { connectMongoose } from "@/server/db/mongoose";

export const dynamic = "force-dynamic";
const bodySchema = z.object({ featured: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A featured state is required." }, { status: 400 });
  }
  const sessionContext = await requireRole(["admin"]);
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid beat ID." }, { status: 400 });
  }
  await consumeAdminStepUpToken({
    request,
    session: sessionContext,
    action: "track_feature",
    targetId: id,
  });
  await connectMongoose();
  const mongoSession = await mongoose.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      const current = await TrackModel.findById(id).session(mongoSession).lean();
      if (!current || (parsed.data.featured && current.status !== "live")) {
        throw new Error("Only a live beat can be featured.");
      }
      if (current.featured === parsed.data.featured) {
        throw new Error("The featured state has already changed.");
      }
      const result = await TrackModel.updateOne(
        { _id: id, status: "live", featured: current.featured },
        { $set: { featured: parsed.data.featured } },
        { session: mongoSession }
      );
      if (result.modifiedCount !== 1) {
        throw new Error("This beat changed during the update. Refresh and try again.");
      }
      await AuditLogModel.create(
        [
          {
            actorId: sessionContext.user.id,
            actorRole: "admin",
            action: parsed.data.featured ? "track_featured" : "track_unfeatured",
            targetCollection: "tracks",
            targetId: id,
            before: { featured: current.featured },
            after: { featured: parsed.data.featured },
            timestamp: new Date(),
          },
        ],
        { session: mongoSession }
      );
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Featured state was not saved." },
      { status: 409 }
    );
  } finally {
    await mongoSession.endSession();
  }
}
