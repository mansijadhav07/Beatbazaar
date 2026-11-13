import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3456",
    trace: "on-first-retry",
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
  ],
  webServer: {
    command: "npx next start -p 3456",
    url: "http://localhost:3456",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

