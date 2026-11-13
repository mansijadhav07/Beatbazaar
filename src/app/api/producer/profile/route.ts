import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import { ProducerProfileSchema } from "@/lib/validations/producer-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireRole(["producer", "admin"]);
    await connectMongoose();
    const profile = await ProducerProfileModel.findOne({ userId: session.user.id });
    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["producer", "admin"]);
    const body = await request.json();

    const parsed = ProducerProfileSchema.safeParse({
      ...body,
      userId: session.user.id,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectMongoose();

    // Check slug collision
    const existing = await ProducerProfileModel.findOne({
      slug: parsed.data.slug,
      userId: { $ne: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ error: "This producer handle is already taken." }, { status: 409 });
    }

    const profile = await ProducerProfileModel.findOneAndUpdate(
      { userId: session.user.id },
      {
        $set: {
          slug: parsed.data.slug,
          displayName: parsed.data.displayName,
          bio: parsed.data.bio,
          avatarKey: parsed.data.avatarKey,
          location: parsed.data.location,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

