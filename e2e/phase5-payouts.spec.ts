import { expect, test } from "./fixtures";

test.describe("Phase 5 producer payouts on iPhone 14", () => {
  test.use({
    playwrightTestRole: "producer",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });

  test("shows payout status and a responsive dashboard with a mocked provider", async ({
    page,
  }) => {
    let onboardingRequests = 0;
    await page.route("**/api/producer/payout-onboarding", async (route) => {
      onboardingRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: {
            linkedAccountId: "acc_test_mock",
            status: "in_review",
            requiredActions: ["provider_review"],
            submittedAt: new Date().toISOString(),
            statusUpdatedAt: new Date().toISOString(),
            activatedAt: null,
          },
        }),
      });
    });

    await page.goto("/dashboard/payouts");
    await expect(
      page.getByRole("heading", { name: "Earnings and payouts" })
    ).toBeVisible();
    await expect(page.getByText(/sales are paid in INR/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /withdraw/i })).toHaveCount(0);

    if (await page.getByRole("button", { name: "Set up payouts" }).isVisible()) {
      await page.getByLabel("Legal name").fill("Test Producer");
      await page.getByLabel("Phone").fill("+919876543210");
      await page.getByLabel("PAN, if available").fill("ABCDE1234F");
      await page.getByLabel("Bank account holder name").fill("Test Producer");
      await page.getByLabel("Bank account number").fill("1234567890123456");
      await page.getByLabel("IFSC").fill("ABCD0123456");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Set up payouts" }).click();
      await expect.poll(() => onboardingRequests).toBe(1);
      await page.waitForLoadState("load");
      await expect(
        page.getByRole("heading", { name: "Earnings and payouts" })
      ).toBeVisible();
    }

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
  });
});
