import { NextResponse, type NextRequest } from "next/server";
import { connectMongoose } from "@/server/db/mongoose";
import { PlayEventModel } from "@/server/db/models/PlayEvent";
import { TrackModel } from "@/server/db/models/Track";
import { checkRateLimit } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Records a track play event.
 * Rate limited to 60 requests per minute per IP.
 * Hourly bucketed in MongoDB PlayEvents collection for batched worker flushing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: trackId } = await params;

    // 1. Rate limiting by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "127.0.0.1";
    const rateCheck = await checkRateLimit(`play:${ip}`, { windowMs: 60 * 1000, maxRequests: 60 });
    if (!rateCheck.success) {
      return NextResponse.json({ error: "Too many play requests." }, { status: 429 });
    }

    await connectMongoose();

    // Verify track exists and is public
    const track = await TrackModel.findOne(
      { _id: trackId, status: { $in: ["live", "sold_exclusive"] } },
      { _id: 1 }
    );
    if (!track) {
      return NextResponse.json({ error: "Track not found." }, { status: 404 });
    }

    // 2. Buffer increment in hourly bucket
    const now = new Date();
    const hourBucket = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0
    );

    await PlayEventModel.findOneAndUpdate(
      { trackId, hourBucket },
      { $inc: { playCount: 1 } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record play";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
