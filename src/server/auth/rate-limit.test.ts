import { describe, expect, it, vi } from "vitest";
import {
  MongoRateLimiter,
  type RateLimitCollection,
  type RateLimitDocument,
} from "./rate-limit";

function createCollection() {
  const records = new Map<string, RateLimitDocument>();
  const findOneAndUpdate = vi.fn<RateLimitCollection["findOneAndUpdate"]>(
    async (filter, update, options) => {
      let record = records.get(filter._id);
      if (!record && !options.upsert) return null;
      if (!record) {
        record = {
          _id: filter._id,
          count: 0,
          expiresAt: update.$setOnInsert.expiresAt,
        };
        records.set(filter._id, record);
      }
      record.count += update.$inc.count;
      return { ...record };
    }
  );
  return {
    collection: { findOneAndUpdate },
    records,
    findOneAndUpdate,
  };
}

describe("MongoRateLimiter", () => {
  it("uses atomic increments and blocks requests above the configured limit", async () => {
    const { collection, findOneAndUpdate } = createCollection();
    const limiter = new MongoRateLimiter(async () => collection, () => 10_000);
    const options = { windowMs: 60_000, maxRequests: 2 };

    await expect(limiter.check("203.0.113.8", options)).resolves.toMatchObject({
      success: true,
      remaining: 1,
      reset: 60_000,
    });
    await expect(limiter.check("203.0.113.8", options)).resolves.toMatchObject({
      success: true,
      remaining: 0,
    });
    await expect(limiter.check("203.0.113.8", options)).resolves.toMatchObject({
      success: false,
      remaining: 0,
    });

    expect(findOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.not.stringContaining("203.0.113.8") }),
      expect.objectContaining({ $inc: { count: 1 } }),
      expect.objectContaining({ upsert: true })
    );
  });

  it("starts a separate counter at the next fixed-window boundary", async () => {
    const { collection, records } = createCollection();
    let now = 59_999;
    const limiter = new MongoRateLimiter(async () => collection, () => now);
    const options = { windowMs: 60_000, maxRequests: 1 };

    await limiter.check("buyer-1", options);
    now = 60_000;
    const nextWindow = await limiter.check("buyer-1", options);

    expect(nextWindow).toMatchObject({ success: true, remaining: 0, reset: 120_000 });
    expect(records.size).toBe(2);
  });

  it("retries a concurrent upsert only for a duplicate-key race", async () => {
    const { collection, findOneAndUpdate } = createCollection();
    const duplicateKey = Object.assign(new Error("duplicate key"), { code: 11000 });
    findOneAndUpdate
      .mockRejectedValueOnce(duplicateKey)
      .mockImplementationOnce(async (filter, update) => ({
        _id: filter._id,
        count: 1,
        expiresAt: update.$setOnInsert.expiresAt,
      }));
    const limiter = new MongoRateLimiter(async () => collection, () => 0);

    await expect(
      limiter.check("buyer-2", { windowMs: 60_000, maxRequests: 1 })
    ).resolves.toMatchObject({ success: true });
    expect(findOneAndUpdate.mock.calls[1][2].upsert).toBe(false);
  });

  it("surfaces database errors instead of falling back to process memory", async () => {
    const failure = new Error("database unavailable");
    const { collection, findOneAndUpdate } = createCollection();
    findOneAndUpdate.mockRejectedValue(failure);
    const limiter = new MongoRateLimiter(async () => collection, () => 0);

    await expect(
      limiter.check("buyer-3", { windowMs: 60_000, maxRequests: 1 })
    ).rejects.toBe(failure);
  });
});
