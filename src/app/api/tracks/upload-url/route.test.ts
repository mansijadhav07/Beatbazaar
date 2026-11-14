import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  connectMongoose: vi.fn(),
  countDocuments: vi.fn(),
  createTrack: vi.fn(),
  createPresignedUploadUrl: vi.fn(),
  startMultipartUpload: vi.fn(),
  getPresignedPartUrl: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("@/server/db/mongoose", () => ({
  connectMongoose: mocks.connectMongoose,
}));
vi.mock("@/server/db/models/Track", () => ({
  TrackModel: {
    countDocuments: mocks.countDocuments,
    create: mocks.createTrack,
  },
}));
vi.mock("@/server/storage/r2", () => ({
  generateStorageKey: () => "originals/test.mp3",
  createPresignedUploadUrl: mocks.createPresignedUploadUrl,
  startMultipartUpload: mocks.startMultipartUpload,
  getPresignedPartUrl: mocks.getPresignedPartUrl,
}));

import { POST } from "./route";

function makeRequest(file: { kind: string; fileName: string; contentType: string; size: number }) {
  return new NextRequest("http://localhost:3000/api/tracks/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Test", files: [file] }),
  });
}

describe("track upload URL limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: "producer-1" } });
    mocks.connectMongoose.mockResolvedValue(undefined);
    mocks.countDocuments.mockResolvedValue(0);
    mocks.createTrack.mockResolvedValue({ _id: { toString: () => "track-1" } });
    mocks.createPresignedUploadUrl.mockResolvedValue({
      uploadUrl: "https://storage.example/upload",
    });
  });

  it("rejects an oversized MP3 before creating a draft or storage upload", async () => {
    const response = await POST(
      makeRequest({
        kind: "mp3",
        fileName: "oversized.mp3",
        contentType: "audio/mpeg",
        size: 200 * 1024 * 1024 + 1,
      })
    );

    expect(response.status).toBe(413);
    expect(mocks.createTrack).not.toHaveBeenCalled();
    expect(mocks.createPresignedUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects a mismatched declared media type before creating a draft", async () => {
    const response = await POST(
      makeRequest({
        kind: "mp3",
        fileName: "fake.mp3",
        contentType: "application/zip",
        size: 1024,
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createTrack).not.toHaveBeenCalled();
    expect(mocks.createPresignedUploadUrl).not.toHaveBeenCalled();
  });
});
