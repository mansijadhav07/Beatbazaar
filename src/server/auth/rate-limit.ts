import { createHash } from "node:crypto";
import { connectToDatabase } from "@/server/db/mongoose";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimiter {
  check(identifier: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

export interface RateLimitDocument {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface RateLimitCollection {
  findOneAndUpdate(
    filter: { _id: string },
    update: {
      $inc: { count: number };
      $setOnInsert: { expiresAt: Date };
    },
    options: {
      upsert: boolean;
      returnDocument: "after";
      includeResultMetadata: false;
    }
  ): Promise<RateLimitDocument | null>;
}

const RETENTION_MS = 24 * 60 * 60 * 1000;

async function getRateLimitCollection(): Promise<RateLimitCollection> {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB is not available for rate limiting.");
  }
  const collection = db.collection<RateLimitDocument>("rate_limits");
  return {
    findOneAndUpdate: (filter, update, options) =>
      collection.findOneAndUpdate(filter, update, options),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export class MongoRateLimiter implements RateLimiter {
  constructor(
    private readonly getCollection: () => Promise<RateLimitCollection> =
      getRateLimitCollection,
    private readonly now: () => number = Date.now
  ) {}

  async check(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    if (
      !identifier ||
      !Number.isSafeInteger(options.windowMs) ||
      options.windowMs <= 0 ||
      !Number.isSafeInteger(options.maxRequests) ||
      options.maxRequests <= 0
    ) {
      throw new Error("Invalid rate limit configuration.");
    }

    const now = this.now();
    const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
    const reset = windowStart + options.windowMs;
    const identifierHash = createHash("sha256")
      .update(identifier)
      .digest("hex");
    const key = `${identifierHash}:${options.windowMs}:${windowStart}`;
    const collection = await this.getCollection();
    const update = {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(reset + RETENTION_MS) },
    };
    const updateOptions = {
      upsert: true,
      returnDocument: "after" as const,
      includeResultMetadata: false as const,
    };

    let record: RateLimitDocument | null;
    try {
      record = await collection.findOneAndUpdate(
        { _id: key },
        update,
        updateOptions
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      record = await collection.findOneAndUpdate(
        { _id: key },
        update,
        { ...updateOptions, upsert: false }
      );
    }

    if (!record) {
      throw new Error("MongoDB did not return the updated rate limit record.");
    }

    return {
      success: record.count <= options.maxRequests,
      limit: options.maxRequests,
      remaining: Math.max(0, options.maxRequests - record.count),
      reset,
    };
  }
}

const limiter = new MongoRateLimiter();

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60_000, maxRequests: 20 }
): Promise<RateLimitResult> {
  return limiter.check(identifier, options);
}
