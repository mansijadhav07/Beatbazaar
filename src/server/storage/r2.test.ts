import { describe, it, expect, vi } from "vitest";
import {
  generateStorageKey,
  getPublicAssetUrl,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  publicBucketName,
  privateBucketName,
} from "./r2";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(async (_client, command, options) => {
    const bucket = command.input?.Bucket || "test-bucket";
    const key = command.input?.Key || "test-key";
    const disposition = command.input?.ResponseContentDisposition
      ? `&disposition=${encodeURIComponent(command.input.ResponseContentDisposition)}`
      : "";
    return `https://${bucket}.mock.r2.cloudflarestorage.com/${key}?expires=${options.expiresIn}${disposition}`;
  }),
}));

describe("Cloudflare R2 Storage Service", () => {
  it("generates opaque random storage keys without PII", () => {
    const key = generateStorageKey("originals", ".WAV");
    expect(key).toMatch(/^originals\/\d+-[a-f0-9]{32}\.wav$/);

    const previewKey = generateStorageKey("previews", "mp3");
    expect(previewKey).toMatch(/^previews\/\d+-[a-f0-9]{32}\.mp3$/);
  });

  it("formats public CDN asset URLs properly", () => {
    const url = getPublicAssetUrl("covers/demo-cover.jpg");
    expect(url).toContain("/covers/demo-cover.jpg");
    expect(url).not.toContain("//covers");
  });

  it("creates presigned upload URLs targeting the correct bucket", async () => {
    const mockClient = {} as any;
    const key = generateStorageKey("covers", "png");

    const publicResult = await createPresignedUploadUrl(
      {
        key,
        contentType: "image/png",
        isPublic: true,
      },
      mockClient
    );

    expect(publicResult.uploadUrl).toContain(publicBucketName);
    expect(publicResult.key).toBe(key);

    const privateResult = await createPresignedUploadUrl(
      {
        key: generateStorageKey("stems", "zip"),
        contentType: "application/zip",
        isPublic: false,
      },
      mockClient
    );

    expect(privateResult.uploadUrl).toContain(privateBucketName);
  });

  it("creates presigned download URLs with content-disposition header", async () => {
    const mockClient = {} as any;
    const downloadUrl = await createPresignedDownloadUrl(
      {
        key: "originals/sample.wav",
        downloadFilename: "Beatbazaar-Exclusive-Track.wav",
        expiresInSeconds: 300,
      },
      mockClient
    );

    expect(downloadUrl).toContain(privateBucketName);
    expect(downloadUrl).toContain("Beatbazaar-Exclusive-Track.wav");
    expect(downloadUrl).toContain("expires=300");
  });
});

