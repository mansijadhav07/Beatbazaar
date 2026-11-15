import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import { resolvePlaywrightBaseUrl } from "./playwright-env.mjs";

dotenv.config({ path: ".env.local", quiet: true });

const testUri = process.env.MONGODB_TEST_URI;
if (!testUri || testUri === process.env.MONGODB_URI) {
  throw new Error("Playwright requires a separate MONGODB_TEST_URI.");
}
const testDatabaseName = decodeURIComponent(
  new URL(testUri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"))
    .pathname.slice(1)
);
if (!/(^|[_-])test($|[_-])/i.test(testDatabaseName)) {
  throw new Error("MONGODB_TEST_URI must use a database name containing test.");
}
process.env.MONGODB_APPLICATION_URI = process.env.MONGODB_URI;
process.env.MONGODB_URI = testUri;

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const testArgs = process.argv.slice(2);
const testBaseUrl = resolvePlaywrightBaseUrl(process.env.PLAYWRIGHT_TEST_BASE_URL);
const explicitTestFiles = testArgs.filter((arg) =>
  /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(arg)
);
const usesAdminTestIdentity =
  explicitTestFiles.length === 0 ||
  explicitTestFiles.some((arg) =>
    /(?:phase2-journey|phase6-admin|accessibility|account-menu|link-audit)\.spec\./.test(arg)
  );
const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", ...testArgs],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_TEST_AUTH_ENABLED: "true",
      PLAYWRIGHT_TEST_AUTH_SECRET: randomBytes(32).toString("base64url"),
      PLAYWRIGHT_TEST_MOCK_PAYMENTS: "true",
      PLAYWRIGHT_TEST_MOCK_STORAGE: "true",
      RAZORPAY_KEY_ID: "rzp_test_mock",
      RAZORPAY_KEY_SECRET: "playwright_test_secret",
      RAZORPAY_WEBHOOK_SECRET: randomBytes(32).toString("hex"),
      PLATFORM_FEE_PERCENT: "0",
      PLAYWRIGHT_TEST_BASE_URL: testBaseUrl,
      NEXT_PUBLIC_APP_URL: testBaseUrl,
      BETTER_AUTH_URL: testBaseUrl,
      EMAIL_SERVER_API_KEY: "mock",
      EMAIL_FROM: "test@astrylix.test",
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
