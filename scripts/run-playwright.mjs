import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_TEST_AUTH_ENABLED: "true",
      PLAYWRIGHT_TEST_AUTH_SECRET: randomBytes(32).toString("base64url"),
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
