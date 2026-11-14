import dotenv from "dotenv";
import { getSeedDatabaseConfig } from "../src/server/db/seed-config";
import { provisionLocalAccount } from "../src/server/db/local-accounts";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

async function createLocalAdmin(): Promise<void> {
  const { uri, databaseName } = getSeedDatabaseConfig(process.env);
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }

  process.env.MONGODB_URI = uri;
  const { default: clientPromise } = await import("../src/server/db/mongodb");
  const client = await clientPromise;
  const id = await provisionLocalAccount(client.db(databaseName), {
    email,
    password,
    name: "Local Admin",
    role: "admin",
  });

  console.log(`Local admin account provisioned in "${databaseName}" (user ${id}).`);
  await client.close();
}

createLocalAdmin().catch((error: unknown) => {
  console.error(
    "Admin bootstrap failed:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exitCode = 1;
});
