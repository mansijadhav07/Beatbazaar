import { hashPassword } from "better-auth/crypto";
import { ObjectId, type Db } from "mongodb";
import { z } from "zod";

const LocalAccountSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(100),
  role: z.enum(["buyer", "producer", "admin"]),
});

export type LocalAccountInput = z.infer<typeof LocalAccountSchema>;

export async function provisionLocalAccount(
  db: Db,
  input: LocalAccountInput
): Promise<string> {
  const account = LocalAccountSchema.parse(input);
  const email = account.email.toLowerCase();
  const now = new Date();
  const users = db.collection("user");
  const accounts = db.collection("account");
  const existingUser = await users.findOne({ email });
  const userId = existingUser?._id ?? new ObjectId();
  if (!(userId instanceof ObjectId)) {
    throw new Error("Local demo accounts require MongoDB ObjectId user ids.");
  }
  const userIdString = userId.toString();
  const passwordHash = await hashPassword(account.password);

  await users.updateOne(
    { _id: userId },
    {
      $set: {
        name: account.name,
        email,
        emailVerified: true,
        image: null,
        role: account.role,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  await accounts.updateMany(
    { userId: userIdString, providerId: "credential" },
    { $set: { userId } }
  );

  await accounts.updateOne(
    { userId, providerId: "credential" },
    {
      $set: {
        accountId: userIdString,
        providerId: "credential",
        userId,
        password: passwordHash,
        updatedAt: now,
      },
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
    },
    { upsert: true }
  );

  return userIdString;
}
