import { expect, test } from "./fixtures";
import { siteConfig } from "@/config/site";

test.describe("public support and SEO pages", () => {
  test("renders the support pages accessibly on iPhone 14", async ({ page, request }, testInfo) => {
    test.skip(
      testInfo.project.name !== "Mobile Safari (iPhone 14)",
      "The public-page viewport check uses the iPhone 14 profile."
    );

    const pages = [
      ["/faq", "Questions about buying and selling beats"],
      ["/help", `Help with ${siteConfig.name}`],
      ["/contact", `Contact ${siteConfig.name}`],
      ["/install", `Use ${siteConfig.name} from your home screen`],
      ["/terms", "Terms of service"],
      ["/privacy", "Privacy"],
      ["/refunds", "Refunds"],
      ["/delivery", "Digital delivery"],
    ] as const;

    const warmupResponses = await Promise.all(
      pages.map(([path]) => request.get(path))
    );
    expect(warmupResponses.every((response) => response.ok())).toBe(true);

    for (const [path, heading] of pages) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      await expect(page.locator("main h1")).toHaveCount(1);

      const pageIssues = await page.evaluate(() => {
        const unlabeledControls = Array.from(
          document.querySelectorAll("button, input, select, textarea")
        )
          .filter((element) => {
            if (element.getAttribute("aria-label") || element.getAttribute("aria-labelledby")) {
              return false;
            }
            if (element instanceof HTMLInputElement && element.labels?.length) {
              return false;
            }
            return !element.textContent?.trim();
          })
          .map((element) => element.tagName.toLowerCase());
        return {
          overflows: document.documentElement.scrollWidth > window.innerWidth,
          unlabeledControls,
        };
      });

      expect(pageIssues.overflows, `${path} overflows the iPhone viewport`).toBe(false);
      expect(pageIssues.unlabeledControls, `${path} has unlabeled controls`).toEqual([]);
    }

    await page.goto("/terms");
    await expect(page.getByText("LEGAL REVIEW REQUIRED", { exact: false })).toBeVisible();
  });

  test("publishes robots, sitemap index, and app manifest", async ({ request }) => {
    const [robotsResponse, sitemapResponse, manifestResponse] = await Promise.all([
      request.get("/robots.txt"),
      request.get("/sitemap.xml"),
      request.get("/manifest.webmanifest"),
    ]);

    expect(robotsResponse.ok()).toBe(true);
    expect(await robotsResponse.text()).toContain("Disallow: /dashboard");
    expect(sitemapResponse.ok()).toBe(true);
    expect(await sitemapResponse.text()).toContain("/sitemaps/static.xml");
    expect(manifestResponse.ok()).toBe(true);
    expect((await manifestResponse.json()).theme_color).toBe("#2C3947");
  });
});
