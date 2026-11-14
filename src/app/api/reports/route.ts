import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/guards";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { isSameOriginRequest } from "@/server/admin/step-up";
import { TrackModel } from "@/server/db/models/Track";
import { ReportModel } from "@/server/db/models/Report";
import { connectMongoose } from "@/server/db/mongoose";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  trackId: z.string().regex(/^[a-f\d]{24}$/i),
  category: z.enum(["copyright", "audio_quality", "misleading_metadata", "other"]),
  details: z.string().trim().min(10).max(3000),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to submit a report." }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(`track-report:${user.id}`, {
    windowMs: 60_000,
    maxRequests: 5,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many reports. Try again shortly." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the report details and try again." }, { status: 400 });
  }
  await connectMongoose();
  const track = await TrackModel.findOne({
    _id: new mongoose.Types.ObjectId(parsed.data.trackId),
    status: "live",
  })
    .select("title")
    .lean();
  if (!track) {
    return NextResponse.json({ error: "This beat is no longer available to report." }, { status: 404 });
  }
  await ReportModel.create({
    trackId: track._id,
    trackTitle: track.title,
    reporterId: user.id,
    reporterEmail: user.email,
    category: parsed.data.category,
    details: parsed.data.details,
    status: "open",
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
