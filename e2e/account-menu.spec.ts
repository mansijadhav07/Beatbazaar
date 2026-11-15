import { expect, test } from "./fixtures";

for (const role of ["buyer", "producer", "admin"] as const) {
  test.describe(`role-aware account navigation for ${role}`, () => {
    test.use({ playwrightTestRole: role });

    test("shows only the role's authorized destinations on desktop and mobile", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");

      await page.getByRole("button", { name: "Account" }).click();
      await expect(page.getByRole("menuitem", { name: "Dashboard" })).toBeVisible();
      if (role === "admin") {
        await expect(page.getByRole("menuitem", { name: "Admin", exact: true })).toBeVisible();
      } else {
        await expect(page.getByRole("menuitem", { name: "Admin", exact: true })).toHaveCount(0);
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const mobileMenu = page.getByRole("navigation", { name: "Mobile menu" });
      await expect(mobileMenu.getByRole("link", { name: "Dashboard" })).toBeVisible();
      if (role === "admin") {
        await expect(mobileMenu.getByRole("link", { name: "Admin", exact: true })).toBeVisible();
      } else {
        await expect(mobileMenu.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
      }

      const headerSellOrUpload = mobileMenu.getByRole("link", {
        name: role === "producer" ? "Upload" : "Sell beats",
      });
      await expect(headerSellOrUpload).toHaveAttribute(
        "href",
        role === "producer" ? "/dashboard/beats/new" : "/login?intent=producer"
      );

      await page.goto("/dashboard");
      if (role === "producer") {
        await expect(page.getByRole("heading", { name: "Producer workspace" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Upload a beat" })).toBeVisible();
      } else if (role === "buyer") {
        await expect(page.getByRole("heading", { name: "Your music account" })).toBeVisible();
        await expect(page.getByRole("link", { name: "View your orders" })).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Open admin workspace" })).toBeVisible();
      }
    });
  });
}
