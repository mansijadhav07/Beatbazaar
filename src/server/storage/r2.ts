import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
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
  process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "https://cdn.example.invalid";

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
  contentLength?: number;
  checksumSha256?: string;
  isPublic?: boolean;
  expiresInSeconds?: number;
}

export async function createPresignedUploadUrl(
  options: PresignedUploadOptions,
  client: S3Client = createR2Client()
): Promise<{ uploadUrl: string; key: string }> {
  const bucket = options.isPublic ? publicBucketName : privateBucketName;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ContentType: options.contentType,
    ...(options.contentLength ? { ContentLength: options.contentLength } : {}),
    ...(options.checksumSha256 ? { ChecksumSHA256: options.checksumSha256 } : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: options.expiresInSeconds || 900, // 15 minutes
    signableHeaders: options.checksumSha256
      ? new Set(["x-amz-checksum-sha256", "content-type"])
      : new Set(["content-type"]),
  });

  return { uploadUrl, key: options.key };
}

export async function createPresignedDownloadUrl(
  options: { key: string; downloadFilename: string; expiresInSeconds?: number },
  client: S3Client = createR2Client()
): Promise<string> {
  const cleanFilename = encodeURIComponent(options.downloadFilename);
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PLAYWRIGHT_TEST_AUTH_ENABLED === "true" &&
    process.env.PLAYWRIGHT_TEST_MOCK_STORAGE === "true"
  ) {
    return `https://playwright-storage.invalid/${encodeURIComponent(options.key)}?filename=${cleanFilename}`;
  }
  const command = new GetObjectCommand({
    Bucket: privateBucketName,
    Key: options.key,
    ResponseContentDisposition: `attachment; filename="${cleanFilename}"`,
  });

  return getSignedUrl(client, command, {
    expiresIn: options.expiresInSeconds || 300,
  });
}

export function getPublicAssetUrl(key: string): string {
  const cleanKey = key.replace(/^\//, "");
  const base = publicDomain.replace(/\/$/, "");
  return `${base}/${cleanKey}`;
}

/**
 * Delete an object from R2 (public or private bucket).
 */
export async function deleteObject(
  key: string,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<void> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/**
 * Fetch object metadata from R2.
 */
export async function headObject(
  key: string,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<{ size: number; contentType: string; etag: string } | null> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return {
      size: res.ContentLength || 0,
      contentType: res.ContentType || "",
      etag: res.ETag || "",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch first bytes of an object for sniffing using HTTP Range GET.
 */
export async function getFirstBytes(
  key: string,
  bytesCount = 64,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<Uint8Array | null> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${bytesCount - 1}`,
      })
    );
    if (!res.Body) return null;
    const array = await res.Body.transformToByteArray();
    return array;
  } catch {
    return null;
  }
}

/**
 * Multipart upload helpers for large WAV and Stems files.
 */
export async function startMultipartUpload(
  key: string,
  contentType: string,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<string> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  const res = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    })
  );
  if (!res.UploadId) throw new Error("Failed to initialize multipart upload");
  return res.UploadId;
}

export async function getPresignedPartUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<string> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function finishMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<void> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    })
  );
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string,
  isPublic = false,
  client: S3Client = createR2Client()
): Promise<void> {
  const bucket = isPublic ? publicBucketName : privateBucketName;
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    })
  );
}
