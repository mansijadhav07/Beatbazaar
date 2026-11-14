import { expect, test } from "./fixtures";

test.describe("Phase 6 admin on iPhone 14", () => {
  test.use({ playwrightTestRole: "admin" });

  test("folds navigation into a sheet and keeps the settings view within the viewport", async ({
    page,
    playwrightTestRole,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Mobile Safari (iPhone 14)",
      "This responsive check is scoped to the iPhone 14 project."
    );
    expect(playwrightTestRole).toBe("admin");
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Site settings" })).toBeVisible();
    await expect(page.getByText("LEGAL REVIEW REQUIRED")).toBeVisible();
    await expect(page.getByRole("button", { name: "Admin sections" })).toBeVisible();

    await page.getByRole("button", { name: "Admin sections" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Reports and takedowns" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Close admin navigation" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflows).toBe(false);
  });
});