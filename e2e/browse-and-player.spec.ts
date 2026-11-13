import { test, expect } from "@playwright/test";

test.describe("Phase 3: Catalog Browsing, Search, and Track Page", () => {
  test("loads /tracks browse page with search and filters", async ({ page }) => {
    await page.goto("/tracks");
    await expect(page).toHaveTitle(/Browse Beats and Instrumentals | Beatbazaar/);

    // Verify search input exists
    const searchInput = page.getByPlaceholder(/Search beats by title/i);
    await expect(searchInput).toBeVisible();

    // Verify page header is rendered
    await expect(page.getByRole("heading", { name: "Explore Beats", level: 1 })).toBeVisible();
  });

  test("filters search parameter updates the URL", async ({ page }) => {
    await page.goto("/tracks");
    const searchInput = page.getByPlaceholder(/Search beats by title/i);
    await searchInput.fill("Trap Anthem");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/q=Trap\+Anthem|q=Trap%20Anthem/);
  });

  test("track page returns 404 for unknown track ID", async ({ page }) => {
    const response = await page.goto("/track/unknown-track-id-9999/test-slug");
    expect(response?.status()).toBe(404);
  });

  test("mobile browse responsive test: filter bottom sheet opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tracks");

    const filterButton = page.getByRole("button", { name: /Filters/i });
    await expect(filterButton).toBeVisible();
    await filterButton.click();

    await expect(page.getByText("Filter Catalog")).toBeVisible();
  });
});
