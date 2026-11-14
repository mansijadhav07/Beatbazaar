import { test, expect } from "./fixtures";

test.describe("Producer Upload Flow (iPhone 14)", () => {
  test.use({
    playwrightTestRole: "producer",
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  test("loads the upload wizard at /dashboard/beats/new and verifies step transitions", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Mobile Safari (iPhone 14)",
      "The upload flow is specifically configured for the iPhone 14 profile."
    );

    // Intercept backend auth and upload APIs for isolated UI testing
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "mock_producer_1",
            name: "Producer Test",
            email: "producer@example.com",
            role: "producer",
            emailVerified: true,
          },
          session: {
            id: "mock_sess",
            userId: "mock_producer_1",
          },
        }),
      });
    });

    await page.route("**/api/tracks/upload-url", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trackId: "mock_track_123",
          uploadUrls: {
            mp3: {
              mode: "single",
              uploadUrl: "https://mock-storage.r2/upload/mp3",
              key: "originals/mock-mp3.mp3",
            },
          },
        }),
      });
    });

    await page.route("https://mock-storage.r2/**", async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.route("**/api/tracks/mock_track_123/confirm", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          trackId: "mock_track_123",
          status: "pending",
          processingStatus: "queued",
        }),
      });
    });

    await page.goto("/dashboard/beats/new");
    await page.waitForLoadState("networkidle");

    // Check heading
    await expect(page.locator("h2")).toContainText("Upload New Beat");

    // Fill Step 1
    await page.locator('input[placeholder="e.g. Bombay Nights"]').fill("Midnight Mumbai");
    await page.locator("button:has-text('Continue to Audio Files')").click();

    // Verify Step 2 reached
    await expect(page.getByText("MP3 Audio Master")).toBeVisible();

    // Attach mock MP3 file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator('input[type="file"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "midnight-mumbai.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("ID3mockaudiocontentsforplaywrighttest"),
    });

    await page.locator("button:has-text('Continue to Licenses')").click();

    // Verify Step 3 reached
    await expect(page.getByText("Rights Confirmation")).toBeVisible();

    // Confirm rights
    await page.getByRole("checkbox", { name: /Rights Confirmation/ }).check();
    await page.getByRole("spinbutton", { name: "Non-Exclusive License" }).fill("250");
    await page.getByLabel("Non-exclusive license terms").fill("Test non-exclusive terms.");
    await page.getByRole("spinbutton", { name: "Exclusive License", exact: true }).fill("2500");
    await page.getByLabel("Exclusive license terms", { exact: true }).fill("Test exclusive terms.");

    // Step 3 to Step 4 (Review)
    await page.locator("button:has-text('Continue to Review')").click();
    await expect(page.getByText("Beat Summary")).toBeVisible();

    // Submit for review from Step 4
    await page.locator("button:has-text('Submit for review')").click();

    // Check redirect to /dashboard/beats
    await expect(page).toHaveURL(/\/dashboard\/beats/);
  });
});
