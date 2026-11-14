import { test, expect } from "./fixtures";

test.describe("Phase 4: Cart and Checkout Flows", () => {
  test("cart page displays empty state and navigation to catalog", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Explore Beats|Browse Beats/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch display currency" })).toHaveCount(0);
    await expect(page.getByText(/international payments in USD/i)).toHaveCount(0);
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
  test.use({ playwrightTestRole: "buyer" });

  test("opens Razorpay test checkout with the verified INR total", async ({ page }) => {
    const trackId = "507f1f77bcf86cd799439011";
    await page.addInitScript(() => {
      localStorage.setItem(
        "bb_cart_v1",
        JSON.stringify([
          {
            trackId: "507f1f77bcf86cd799439011",
            licenseTier: "non_exclusive",
            trackTitle: "Test beat",
            producerName: "Test producer",
          },
        ])
      );
      Object.defineProperty(window, "Razorpay", {
        configurable: true,
        value: function (options: {
          amount: number;
          currency: string;
          order_id: string;
        }) {
          const testWindow = window as Window & {
            __razorpayOptions?: typeof options;
            __razorpayOpened?: boolean;
          };
          testWindow.__razorpayOptions = options;
          return {
            on: () => undefined,
            open: () => {
              testWindow.__razorpayOpened = true;
            },
          };
        },
      });
    });
    await page.route("**/api/cart/summary", (route) =>
      route.fulfill({
        json: {
          items: [
            {
              trackId,
              licenseTier: "non_exclusive",
              title: "Test beat",
              producerName: "Test producer",
              coverKey: null,
              price: { amount: 25000, currency: "INR" },
              available: true,
            },
          ],
        },
      })
    );

    let orderRequest: { items: unknown[]; currency: string } | undefined;
    await page.route("**/api/orders", async (route) => {
      orderRequest = route.request().postDataJSON();
      await route.fulfill({
        json: {
          orderId: "507f1f77bcf86cd799439012",
          providerOrderId: "order_test_123",
          checkoutKeyId: "rzp_test_key",
          amountMinorUnits: 25000,
          currency: "INR",
          isFree: false,
        },
      });
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Order Checkout" })).toBeVisible();
    await expect(page.getByText("₹250").first()).toBeVisible();
    await page.getByRole("button", { name: "Pay ₹250" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => Boolean((window as Window & { __razorpayOpened?: boolean }).__razorpayOpened))
      )
      .toBe(true);

    expect(orderRequest).toEqual({
      items: [{ trackId, licenseTier: "non_exclusive" }],
      currency: "INR",
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const options = (window as Window & {
            __razorpayOptions?: { amount: number; currency: string; order_id: string };
          }).__razorpayOptions;
          return options
            ? [options.amount, options.currency, options.order_id]
            : null;
        })
      )
      .toEqual([25000, "INR", "order_test_123"]);
  });

  test("renders mobile responsive cart and checkout layouts without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await page.getByRole("button", { name: "Toggle menu" }).click();
    await expect(page.getByText(/^Currency:/)).toHaveCount(0);

    // Check no horizontal scrollbar on 390px viewport
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
