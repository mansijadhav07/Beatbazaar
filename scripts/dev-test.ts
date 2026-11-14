import { spawn } from "node:child_process";
import dotenv from "dotenv";
import { getSeedDatabaseConfig } from "../src/server/db/seed-config";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { uri, databaseName } = getSeedDatabaseConfig({
  NODE_ENV: "development",
  MONGODB_URI:
    process.env.MONGODB_APPLICATION_URI || process.env.MONGODB_URI,
  MONGODB_TEST_URI: process.env.MONGODB_TEST_URI,
});
const appEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  MONGODB_URI: uri,
  NODE_ENV: "development",
};
delete appEnvironment.MONGODB_APPLICATION_URI;

console.log(`Starting local app against isolated test database "${databaseName}".`);

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: appEnvironment,
  }
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error("Could not start the local Next.js server.", error);
  process.exitCode = 1;
});

server.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
