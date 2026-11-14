import { expect, test as base } from "@playwright/test";

type TestRole = "buyer" | "producer" | "admin";

export type TestOptions = {
  playwrightTestAuthSecret: string;
  playwrightTestRole: TestRole | null;
};

export const test = base.extend<TestOptions & { testIdentity: void }>({
  playwrightTestAuthSecret: ["", { option: true }],
  playwrightTestRole: [null, { option: true }],
  testIdentity: [
    async ({ context, playwrightTestAuthSecret, playwrightTestRole }, use) => {
      if (playwrightTestRole) {
        if (!playwrightTestAuthSecret) {
          throw new Error("The Playwright test identity secret is not configured.");
        }
        await context.setExtraHTTPHeaders({
          "x-playwright-test-role": playwrightTestRole,
          "x-playwright-test-secret": playwrightTestAuthSecret,
        });
        await context.route("**/admin/**", async (route) => {
          const headers = route.request().headers();
          if (
            headers["x-playwright-test-role"] !== playwrightTestRole ||
            headers["x-playwright-test-secret"] !== playwrightTestAuthSecret
          ) {
            throw new Error("The Playwright admin identity headers were not sent.");
          }
          await route.continue();
        });
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
