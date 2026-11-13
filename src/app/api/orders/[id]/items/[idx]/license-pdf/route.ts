import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { DownloadRecordModel } from "@/server/db/models/Download";
import { checkRateLimit } from "@/server/auth/rate-limit";
import {
  createR2Client,
  privateBucketName,
  headObject,
  createPresignedDownloadUrl,
} from "@/server/storage/r2";
import { generateLicensePdf } from "@/server/payments/pdf";
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
      return NextResponse.json({ error: "License not found." }, { status: 404 });
    }

    const rateCheck = await checkRateLimit(`license-pdf:${user.id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many PDF requests. Please try again later." },
        { status: 429 }
      );
    }

    await connectMongoose();

    const order = await OrderModel.findById(orderId);
    if (!order || order.buyerId !== user.id) {
      return NextResponse.json({ error: "License not found." }, { status: 404 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `Cannot generate license for order in "${order.status}" status.` },
        { status: 403 }
      );
    }

    const item = order.items[itemIdx];
    if (!item) {
      return NextResponse.json({ error: "Item not found in order." }, { status: 404 });
    }

    // Check if revoked
    const record = await DownloadRecordModel.findOne({
      orderId: order._id,
      orderItemIdx: itemIdx,
    });
    if (record?.revoked) {
      return NextResponse.json(
        { error: "This license has been revoked." },
        { status: 403 }
      );
    }

    const storageKey = `licenses/${orderId}/${itemIdx}.pdf`;
    const r2Client = createR2Client();

    // Check if PDF is already generated and cached in R2
    const existing = await headObject(storageKey, false, r2Client);
    if (!existing) {
      // Generate PDF
      const pdfBuffer = await generateLicensePdf(
        orderId,
        itemIdx,
        item,
        user.name || "Verified Buyer",
        order.createdAt
      );

      // Upload to private bucket
      await r2Client.send(
        new PutObjectCommand({
          Bucket: privateBucketName,
          Key: storageKey,
          Body: pdfBuffer,
          ContentType: "application/pdf",
        })
      );
    }

    const cleanTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadFilename = `License_${cleanTitle}_${item.licenseTier}.pdf`;

    const downloadUrl = await createPresignedDownloadUrl(
      {
        key: storageKey,
        downloadFilename,
        expiresInSeconds: siteConfig.downloadLinkExpirySeconds,
      },
      r2Client
    );

    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("application/json")) {
      return NextResponse.json({ downloadUrl, filename: downloadFilename });
    }

    return NextResponse.redirect(downloadUrl, { status: 302 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate license PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

