import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";

export const publicBucketName =
  process.env.CLOUDFLARE_R2_PUBLIC_BUCKET_NAME || "beatbazaar-public";
export const privateBucketName =
  process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME || "beatbazaar-private";
export const publicDomain =
  process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "https://cdn.beatbazaar.com";

export function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Generates an opaque random storage key with an optional prefix.
 * Keys never contain user IDs, names, or personally identifiable information.
 */
export function generateStorageKey(
  category: "previews" | "covers" | "originals" | "stems" | "licenses",
  extension: string
): string {
  const cleanExt = extension.replace(/^\./, "").toLowerCase();
  const randomBytes = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  return `${category}/${timestamp}-${randomBytes}.${cleanExt}`;
}

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  contentLengthMaxBytes?: number;
  isPublic?: boolean;
  expiresInSeconds?: number;
}

/**
 * Creates a presigned PUT URL for direct browser uploads.
 */
export async function createPresignedUploadUrl(
  options: PresignedUploadOptions,
  client: S3Client = createR2Client()
): Promise<{ uploadUrl: string; key: string }> {
  const bucket = options.isPublic ? publicBucketName : privateBucketName;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ContentType: options.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: options.expiresInSeconds || 900, // 15 minutes default
  });

  return { uploadUrl, key: options.key };
}

export interface PresignedDownloadOptions {
  key: string;
  downloadFilename: string;
  expiresInSeconds?: number;
}

/**
 * Creates a temporary presigned GET URL for authorized downloads from the private bucket.
 */
export async function createPresignedDownloadUrl(
  options: PresignedDownloadOptions,
  client: S3Client = createR2Client()
): Promise<string> {
  const cleanFilename = encodeURIComponent(options.downloadFilename);
  const command = new GetObjectCommand({
    Bucket: privateBucketName,
    Key: options.key,
    ResponseContentDisposition: `attachment; filename="${cleanFilename}"`,
  });

  return getSignedUrl(client, command, {
    expiresIn: options.expiresInSeconds || 300, // 5 minutes default
  });
}

/**
 * Resolves the public CDN URL for assets stored in the public bucket.
 */
export function getPublicAssetUrl(key: string): string {
  const cleanKey = key.replace(/^\//, "");
  const base = publicDomain.replace(/\/$/, "");
  return `${base}/${cleanKey}`;
}

