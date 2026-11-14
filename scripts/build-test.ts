import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { getSeedDatabaseConfig } from "../src/server/db/seed-config";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { uri } = getSeedDatabaseConfig({
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI,
});
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    MONGODB_URI: uri,
    NODE_ENV: "production",
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
