import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const testArgs = process.argv.slice(2);
const usesAdminTestIdentity =
  testArgs.length === 0 || testArgs.some((arg) => arg.includes("phase6-admin.spec"));
const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...testArgs],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_TEST_AUTH_ENABLED: "true",
      PLAYWRIGHT_TEST_AUTH_SECRET: randomBytes(32).toString("base64url"),
      ...(usesAdminTestIdentity ? { PLAYWRIGHT_TEST_ALLOW_ADMIN: "true" } : {}),
    },
  }
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  console.error(`Playwright exited after signal ${result.signal}.`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
