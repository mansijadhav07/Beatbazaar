import { randomBytes } from "node:crypto";
import { MongoClient, type Collection } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MongoRateLimiter,
  type RateLimitCollection,
  type RateLimitDocument,
} from "./rate-limit";

const testUri = process.env.MONGODB_TEST_URI;
const runDatabaseTests = Boolean(testUri);
const collectionName = `rate_limits_test_${randomBytes(6).toString("hex")}`;
let client: MongoClient | undefined;
let collection: Collection<RateLimitDocument>;

describe.skipIf(!runDatabaseTests)("MongoRateLimiter MongoDB integration", () => {
  beforeAll(async () => {
    if (!testUri) {
      throw new Error("MONGODB_TEST_URI is required for this integration test.");
    }
    if (testUri === process.env.MONGODB_APPLICATION_URI) {
      throw new Error("MONGODB_TEST_URI must not match MONGODB_URI.");
    }
    let databaseName: string;
    try {
      const parsed = new URL(
        testUri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")
      );
      databaseName = decodeURIComponent(parsed.pathname.slice(1));
    } catch {
      throw new Error("MONGODB_TEST_URI is not a valid MongoDB URI.");
    }
    if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
      throw new Error("MONGODB_TEST_URI must use a database name containing test.");
    }
    client = new MongoClient(testUri);
    await client.connect();
    const db = client.db();
    collection = db.collection(collectionName);
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "test_rate_limit_expiry" }
    );
  });

  afterAll(async () => {
    if (client) {
      await client.db().dropCollection(collectionName);
      await client.close();
    }
  });

  it("atomically limits concurrent requests without storing the raw identifier", async () => {
    const rateLimitCollection: RateLimitCollection = {
      findOneAndUpdate: (filter, update, options) =>
        collection.findOneAndUpdate(filter, update, options),
    };
    const limiter = new MongoRateLimiter(async () => rateLimitCollection);
    const identifier = "producer@example.test";
    const options = { windowMs: 60_000, maxRequests: 5 };
    const results = await Promise.all(
      Array.from({ length: 10 }, () => limiter.check(identifier, options))
    );

    expect(results.filter((result) => result.success)).toHaveLength(5);
    expect(results.filter((result) => !result.success)).toHaveLength(5);

    const record = await collection.findOne({});
    expect(record?.count).toBe(10);
    expect(record?._id).not.toContain(identifier);
    expect(record?.expiresAt).toBeInstanceOf(Date);
  });
});
