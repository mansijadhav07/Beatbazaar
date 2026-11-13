"use server";

import "server-only";
import { headers } from "next/headers";
import { getAuthInstance } from "./auth";
import clientPromise from "@/server/db/mongodb";
import { ObjectId } from "mongodb";

/**
 * Explicit server action to upgrade the authenticated user's role to producer.
 * Can only set role to "producer" (never admin). Requires an active authenticated session.
 */
export async function becomeProducerAction(): Promise<{ success: boolean; error?: string }> {
  const requestHeaders = await headers();
  const authInstance = await getAuthInstance();
  const session = await authInstance.api.getSession({
    headers: requestHeaders,
  });

  if (!session || !session.user) {
    return { success: false, error: "Authentication required." };
  }

  const userId = session.user.id;
  const client = await clientPromise;
  const db = client.db();

  // Update role explicitly on the database document
  const filter = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { id: userId };
  await db.collection("user").updateOne(filter, {
    $set: {
      role: "producer",
      updatedAt: new Date(),
    },
  });

  return { success: true };
}

