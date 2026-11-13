import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["producer", "admin"]);
    const producerId = session.user.id;

    await connectMongoose();
    // Exclude play counts as requested in Phase 2 rule 9
    const tracks = await TrackModel.find({ producerId })
      .select("-playCount")
      .sort({ createdAt: -1 });

    return NextResponse.json({ tracks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load beats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

