import { describe, expect, it, vi } from "vitest";
import { ObjectId, type Db, type Document } from "mongodb";
import { provisionLocalAccount } from "./local-accounts";

describe("provisionLocalAccount", () => {
  it("stores the credential user reference as an ObjectId and repairs legacy string references", async () => {
    const userId = new ObjectId();
    const users = {
      findOne: vi.fn(async () => ({ _id: userId })),
      updateOne: vi.fn(async () => ({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
      })),
    };
    const accounts = {
      updateMany: vi.fn(async (_filter: Document, _update: Document) => ({
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
        upsertedId: null,
      })),
      updateOne: vi.fn(
        async (
          _filter: Document,
          _update: Document,
          _options?: { upsert?: boolean }
        ) => ({
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
        upsertedId: null,
        })
      ),
    };
    const db = {
      collection: (name: string) => (name === "user" ? users : accounts),
    } as unknown as Db;

    await provisionLocalAccount(db, {
      email: "ADMIN@BEATBAZAAR.TEST",
      name: "Local Demo Admin",
      password: "local-demo-password",
      role: "admin",
    });

    expect(accounts.updateMany).toHaveBeenCalledWith(
      { userId: userId.toString(), providerId: "credential" },
      { $set: { userId } }
    );
    const [filter, update] = accounts.updateOne.mock.calls[0];
    expect(filter).toEqual({ userId, providerId: "credential" });
    expect(update.$set).toMatchObject({
      accountId: userId.toString(),
      userId,
    });
  });
});
