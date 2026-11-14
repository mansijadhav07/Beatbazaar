import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { getCurrentUser } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { TrackModel } from "@/server/db/models/Track";
import { DownloadRecordModel, DownloadTokenModel } from "@/server/db/models/Download";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId, idx: idxParam } = await params;
    const itemIdx = parseInt(idxParam, 10);

    if (!mongoose.isValidObjectId(orderId) || isNaN(itemIdx)) {
      return NextResponse.json({ error: "Download not found." }, { status: 404 });
    }

    // Rate limiting: 20 download link generations per hour per user
    const rateCheck = await checkRateLimit(`download:${user.id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 20,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Download rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    await connectMongoose();

    const order = await OrderModel.findById(orderId);
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ error: "Download not found." }, { status: 404 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `Cannot download files for order in "${order.status}" status.` },
        { status: 403 }
      );
    }

    const item = order.items[itemIdx];
    if (!item) {
      return NextResponse.json({ error: "Item not found in order." }, { status: 404 });
    }

    // Check if download record is revoked
    const record = await DownloadRecordModel.findOne({
      orderId: order._id,
      orderItemIdx: itemIdx,
    });

    if (record?.revoked) {
      return NextResponse.json(
        { error: "This license download has been revoked." },
        { status: 403 }
      );
    }

    const track = await TrackModel.findById(item.trackId);
    if (!track) {
      return NextResponse.json({ error: "Audio track files not found." }, { status: 404 });
    }

    // Determine target file from included files in license tier
    // Exclusive: WAV or Stems (fallback MP3)
    // Non-exclusive: MP3 or WAV
    // Free: MP3 or Preview
    let targetFile = track.files.find((f) => f.kind === "wav");
    if (!targetFile && item.licenseTier !== "exclusive") {
      targetFile = track.files.find((f) => f.kind === "mp3");
    }
    if (!targetFile) {
      targetFile = track.files[0];
    }

    if (!targetFile) {
      return NextResponse.json({ error: "Audio file not available." }, { status: 404 });
    }

    const ext = targetFile.mimeType.includes("wav")
      ? "wav"
      : targetFile.mimeType.includes("zip")
        ? "zip"
        : "mp3";

    const cleanTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadFilename = `${cleanTitle}-${item.licenseTier}.${ext}`;

    const rawToken = crypto.randomBytes(24).toString("hex");
    await DownloadTokenModel.create({
      orderId: order._id,
      itemId: `${itemIdx}`,
      token: crypto.createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + siteConfig.downloadLinkExpirySeconds * 1000),
      ipHash: "",
      downloadCount: 0,
    });

    const downloadUrl = `/api/downloads/${rawToken}`;
    // Check if client expects JSON or redirect
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
      return NextResponse.json({ downloadUrl, filename: downloadFilename });
    }

    return NextResponse.redirect(new URL(downloadUrl, request.nextUrl.origin), { status: 302 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process download";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
