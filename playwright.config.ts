import { defineConfig, devices } from "@playwright/test";
import type { TestOptions } from "./e2e/fixtures";

const playwrightTestSecret = process.env.PLAYWRIGHT_TEST_AUTH_SECRET;
if (!playwrightTestSecret) {
  throw new Error("Run Playwright through npm run e2e to configure its test identity.");
}
if (!process.env.MONGODB_TEST_URI || process.env.MONGODB_URI !== process.env.MONGODB_TEST_URI) {
  throw new Error("Run Playwright with the isolated MONGODB_TEST_URI via npm run e2e.");
}
process.env.PLAYWRIGHT_TEST_AUTH_ENABLED = "true";

export default defineConfig<TestOptions>({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3456",
    trace: "on-first-retry",
    playwrightTestAuthSecret: playwrightTestSecret,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Desktop Safari",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Safari (iPhone 14)",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Mobile Safari (iPhone SE)",
      use: { ...devices["iPhone SE"] },
    },
    {
      name: "Tablet Safari (iPad Pro 11)",
      use: { ...devices["iPad Pro 11"] },
    },
    {
      name: "Tablet Safari (iPad Pro 11 landscape)",
      use: {
        ...devices["iPad Pro 11"],
        viewport: { width: 1194, height: 834 },
      },
    },
    {
      name: "Mobile Chrome (Pixel 7)",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3456",
    url: "http://127.0.0.1:3456",
    env: {
      ...process.env,
      PLAYWRIGHT_TEST_AUTH_ENABLED: "true",
      PLAYWRIGHT_TEST_AUTH_SECRET: playwrightTestSecret,
      NODE_ENV: "development",
    },
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});