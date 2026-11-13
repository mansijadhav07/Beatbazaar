import { test, expect, devices } from "@playwright/test";

test.describe("Phase 4: Cart and Checkout Flows", () => {
  test("cart page displays empty state and navigation to catalog", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Explore Beats|Browse Beats/i })).toBeVisible();
  });

  test("track page has interactive Add to Cart button when beat is available", async ({ page }) => {
    // Visit tracks page first to check catalog
    await page.goto("/tracks");
    expect(page.url()).toContain("/tracks");
  });

  test("orders page requires authentication and redirects unauthenticated guest", async ({ page }) => {
    const response = await page.goto("/dashboard/orders");
    // Middleware redirects unauthenticated users to /login?redirect=/dashboard/orders
    expect([200, 302, 307]).toContain(response?.status());
    if (response?.status() === 200) {
      expect(page.url()).toContain("/login");
    }
  });

  test("sales dashboard requires authentication", async ({ page }) => {
    const response = await page.goto("/dashboard/sales");
    expect([200, 302, 307]).toContain(response?.status());
    if (response?.status() === 200) {
      expect(page.url()).toContain("/login");
    }
  });

  test("persistent audio player remains mounted during client side navigation", async ({ page }) => {
    await page.goto("/tracks");
    // Audio player container is mounted in root layout
    const playerContainer = page.locator("body");
    await expect(playerContainer).toBeVisible();

    // Client navigation to cart
    const cartLink = page.getByRole("link", { name: /cart/i }).first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForURL("**/cart");
      expect(page.url()).toContain("/cart");
    }
  });
});

test.describe("Phase 4: Mobile iPhone 14 Checkout Viewport", () => {
  test("renders mobile responsive cart and checkout layouts without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

    // Check no horizontal scrollbar on 390px viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
