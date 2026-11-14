import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth/guards";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { connectMongoose } from "@/server/db/mongoose";
import { DownloadRecordModel, DownloadTokenModel } from "@/server/db/models/Download";
import { OrderModel } from "@/server/db/models/Order";
import { TrackModel } from "@/server/db/models/Track";
import { createPresignedDownloadUrl } from "@/server/storage/r2";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const rateLimit = await checkRateLimit(`download:${user.id}`, {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  });
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Download rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const { token } = await params;
  if (!/^[a-f\d]{48}$/i.test(token)) {
    return NextResponse.json({ error: "Download not found." }, { status: 404 });
  }

  try {
    await connectMongoose();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenRecord = await DownloadTokenModel.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!tokenRecord) {
      return NextResponse.json({ error: "This download link has expired." }, { status: 404 });
    }

    const order = await OrderModel.findById(tokenRecord.orderId);
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ error: "Download not found." }, { status: 404 });
    }
    if (order.status !== "paid") {
      return NextResponse.json(
        { error: "This license download has been revoked." },
        { status: 403 }
      );
    }

    const itemIndex = Number(tokenRecord.itemId);
    if (!Number.isSafeInteger(itemIndex) || itemIndex < 0 || !order.items[itemIndex]) {
      return NextResponse.json({ error: "Download not found." }, { status: 404 });
    }
    const downloadRecord = await DownloadRecordModel.findOne({
      orderId: order._id,
      orderItemIdx: itemIndex,
      buyerId: user.id,
      revoked: false,
    }).lean();
    if (!downloadRecord) {
      return NextResponse.json(
        { error: "This license download has been revoked." },
        { status: 403 }
      );
    }

    const item = order.items[itemIndex];
    const track = await TrackModel.findById(item.trackId);
    const targetFile =
      track?.files.find((file) => file.kind === "wav") ||
      track?.files.find((file) => file.kind === "mp3");
    if (!targetFile) {
      return NextResponse.json({ error: "Audio file not available." }, { status: 404 });
    }

    const extension = targetFile.mimeType.includes("wav")
      ? "wav"
      : targetFile.mimeType.includes("zip")
        ? "zip"
        : "mp3";
    const cleanTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadUrl = await createPresignedDownloadUrl({
      key: targetFile.r2Key,
      downloadFilename: `${cleanTitle}-${item.licenseTier}.${extension}`,
      expiresInSeconds: siteConfig.downloadLinkExpirySeconds,
    });

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    await Promise.all([
      DownloadTokenModel.updateOne(
        { _id: tokenRecord._id, expiresAt: { $gt: new Date() } },
        {
          $inc: { downloadCount: 1 },
          $set: { ipHash: crypto.createHash("sha256").update(ip).digest("hex") },
        }
      ),
      DownloadRecordModel.updateOne(
        { _id: downloadRecord._id, revoked: false },
        { $inc: { downloadCount: 1 }, $set: { lastDownloadedAt: new Date() } }
      ),
    ]);

    return NextResponse.redirect(downloadUrl, { status: 302 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process download.",
      },
      { status: 500 }
    );
  }
}
