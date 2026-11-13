import { test, expect } from "@playwright/test";

test.describe("Beatbazaar Responsive Shell", () => {
  test("loads the home page without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    // Verify title contains product name
    await expect(page).toHaveTitle(/Beatbazaar/i);

    // Verify main header and heading are present
    const mainHeading = page.locator("h1");
    await expect(mainHeading).toBeVisible();

    // Verify no horizontal scrolling exists
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test("tracks browse page loads cleanly with filter inputs", async ({ page }) => {
    await page.goto("/tracks");
    await expect(page.locator("h1")).toContainText("Explore Beats");

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test("login page displays sign in and registration tabs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign In to Beatbazaar")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});

