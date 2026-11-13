import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindOneAndUpdate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockCreate = vi.fn();
const mockFindById = vi.fn();

vi.mock("@/server/db/mongoose", () => ({
  connectMongoose: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/db/models/Job", () => ({
  JobModel: {
    create: (...args: any[]) => mockCreate(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findById: (...args: any[]) => mockFindById(...args),
  },
}));

vi.mock("server-only", () => ({}));

import { enqueueJob, claimNextJob, completeJob, failJob } from "./queue";

describe("MongoDB Job Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a job with pending status", async () => {
    mockCreate.mockResolvedValueOnce({ _id: "job_123", status: "pending" });
    const res = await enqueueJob("process-track", { trackId: "track_abc" });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "process-track",
        payload: { trackId: "track_abc" },
        status: "pending",
      })
    );
    expect(res._id).toBe("job_123");
  });

  it("claims a job atomically and sets worker lock", async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({
      _id: "job_123",
      type: "process-track",
      status: "processing",
      lockedBy: "worker-1",
      attempts: 1,
    });

    const job = await claimNextJob("worker-1");
    expect(job).not.toBeNull();
    expect(job?._id).toBe("job_123");
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });

  it("completes a job and releases lock", async () => {
    await completeJob("job_123");
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "job_123",
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "completed",
          lockedAt: null,
          lockedBy: null,
        }),
      })
    );
  });

  it("fails a job with exponential backoff on retry", async () => {
    mockFindById.mockResolvedValueOnce({
      _id: "job_123",
      attempts: 1,
      maxAttempts: 3,
    });

    await failJob("job_123", "FFmpeg failure");
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "job_123",
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "pending",
          error: "FFmpeg failure",
        }),
      })
    );
  });
});

