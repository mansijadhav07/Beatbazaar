import { describe, expect, it } from "vitest";
import {
  isUploadFileTypeCompatible,
  isUploadMimeTypeAllowed,
  MAX_UPLOAD_BYTES,
} from "./upload-files";

describe("upload file policy", () => {
  it("defines finite limits for every upload type", () => {
    expect(Object.values(MAX_UPLOAD_BYTES).every(Number.isSafeInteger)).toBe(true);
    expect(MAX_UPLOAD_BYTES.mp3).toBe(200 * 1024 * 1024);
    expect(MAX_UPLOAD_BYTES.wav).toBe(1024 * 1024 * 1024);
    expect(MAX_UPLOAD_BYTES.stems).toBe(1024 * 1024 * 1024);
    expect(MAX_UPLOAD_BYTES.cover).toBe(20 * 1024 * 1024);
  });

  it("allows only matching declared MIME types", () => {
    expect(isUploadMimeTypeAllowed("mp3", "audio/mpeg")).toBe(true);
    expect(isUploadMimeTypeAllowed("wav", "audio/x-wav")).toBe(true);
    expect(isUploadMimeTypeAllowed("stems", "application/zip")).toBe(true);
    expect(isUploadMimeTypeAllowed("cover", "image/webp")).toBe(true);
    expect(isUploadMimeTypeAllowed("mp3", "application/zip")).toBe(false);
  });

  it("does not accept an unrelated valid binary format for an audio kind", () => {
    expect(isUploadFileTypeCompatible("mp3", "application/zip")).toBe(false);
    expect(isUploadFileTypeCompatible("wav", "audio/mpeg")).toBe(false);
    expect(isUploadFileTypeCompatible("stems", "audio/wav")).toBe(false);
    expect(isUploadFileTypeCompatible("stems", "application/zip")).toBe(true);
  });
});
