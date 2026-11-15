import { expect, test } from "./fixtures";
import type { Response } from "@playwright/test";

type TestRole = "buyer" | "producer" | "admin";

const publicRoutes = [
  "/",
  "/tracks",
  "/tracks?sort=newest",
  "/tracks?genre=Fixture%20Genre&page=1",
  "/license-overview",
  "/terms",
  "/privacy",
  "/refunds",
  "/delivery",
  "/producer-guidelines",
  "/copyright-and-takedown",
  "/faq",
  "/help",
  "/contact",
  "/install",
  "/report",
  "/beats/genre/hip-hop",
  "/beats/language/instrumental",
  "/beats/in/mumbai",
  "/producers/in/maharashtra",
  "/producers/in/mumbai",
];

const roleRoutes: Record<TestRole, string[]> = {
  buyer: ["/dashboard", "/dashboard/orders", "/cart", "/checkout"],
  producer: [
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/beats",
    "/dashboard/beats/new",
    "/dashboard/sales",
    "/dashboard/payouts",
  ],
  admin: [
    "/admin",
    "/admin/reports",
    "/admin/users",
    "/admin/orders",
    "/admin/payouts",
    "/admin/featured",
    "/admin/settings",
    "/admin/audit",
  ],
};

function getRedirectCount(response: Response | null): number {
  let count = 0;
  let request = response?.request() ?? null;
  while (request?.redirectedFrom()) {
    count += 1;
    request = request.redirectedFrom();
  }
  return count;
}

for (const role of ["buyer", "producer", "admin"] as const) {
  test.describe(`internal link crawl as ${role}`, () => {
    test.use({ playwrightTestRole: role });

    test("visits feature routes and validates links, redirects, and canonicals", async ({
      page,
    }) => {
      test.setTimeout(180_000);
      page.setDefaultNavigationTimeout(60_000);
      const paths = new Set([...publicRoutes, ...roleRoutes[role]]);
      const sitemapResponse = await page.goto("/sitemap.xml");
      expect(sitemapResponse?.status()).toBe(200);
      const base = new URL(page.url());
      const sitemapXml = await sitemapResponse!.text();
      const sitemapUrls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
        match[1].trim()
      );
      const sitemapContentPaths = new Set<string>();

      for (const sitemapUrl of sitemapUrls) {
        const url = new URL(sitemapUrl, base);
        if (url.origin === base.origin && url.pathname.endsWith(".xml")) {
          const childResponse = await page.goto(url.toString());
          expect(childResponse?.status(), url.pathname).toBe(200);
          const childXml = await childResponse!.text();
          for (const match of childXml.matchAll(/<loc>(.*?)<\/loc>/g)) {
            const location = new URL(match[1].trim(), base);
            if (location.origin === base.origin) {
              sitemapContentPaths.add(location.pathname);
              paths.add(`${location.pathname}${location.search}`);
            }
          }
        } else if (url.origin === base.origin) {
          sitemapContentPaths.add(url.pathname);
          paths.add(`${url.pathname}${url.search}`);
        }
      }

      const foundInternalLinks = new Set<string>();
      const violations: string[] = [];

      for (const path of paths) {
        const pathUrl = new URL(path, base);
        if (pathUrl.pathname.startsWith("/api/") || pathUrl.pathname.endsWith(".csv")) {
          const apiStatus = await page.evaluate(async (url) => {
            const response = await fetch(url);
            return response.status;
          }, pathUrl.toString());
          expect(apiStatus, `${role} could not open ${path}`).toBeLessThan(400);
          continue;
        }
        const response = await page.goto(path, { waitUntil: "commit" });
        await expect(page.locator("main").first()).toBeVisible();
        await expect(page.locator("main").first()).toContainText(/\S/);
        const status = response?.status() ?? 0;
        const expectedMissingAdminPage = role !== "admin" && path.startsWith("/admin");
        const isQualityGatedLanding =
          /^\/beats\/(?:genre|language|in)\//.test(pathUrl.pathname) ||
          /^\/producers\/in\//.test(pathUrl.pathname);
        const expectedThinLanding =
          isQualityGatedLanding && !sitemapContentPaths.has(pathUrl.pathname);
        if (expectedMissingAdminPage) {
          expect(status, `${role} should not open ${path}`).toBe(404);
        } else {
          expect(status, `${role} received a server error at ${path}`).toBeLessThan(400);
        }
        expect(
          getRedirectCount(response),
          `${path} used more than one redirect`
        ).toBeLessThanOrEqual(1);

        const pageLinks = await page.locator("a").evaluateAll((anchors) =>
          anchors.map((anchor) => ({
            href: anchor.getAttribute("href"),
            rel: anchor.getAttribute("rel") || "",
          }))
        );
        for (const link of pageLinks) {
          if (!link.href || link.href.trim() === "#") {
            violations.push(`${path}: empty or placeholder anchor`);
            continue;
          }
          const target = new URL(link.href, base);
          if (target.origin !== base.origin) {
            if (!/\bnoopener\b/.test(link.rel) || !/\bnoreferrer\b/.test(link.rel)) {
              violations.push(`${path}: external link is missing rel noopener noreferrer`);
            }
            continue;
          }
          if (!target.hash) {
            foundInternalLinks.add(target.pathname);
            paths.add(`${target.pathname}${target.search}`);
          }
          if (target.pathname !== "/" && target.pathname.endsWith("/")) {
            violations.push(`${path}: trailing slash is inconsistent at ${target.pathname}`);
          }
          if (target.hostname === "localhost" || target.hostname === "127.0.0.1") {
            if (target.origin !== base.origin) {
              violations.push(`${path}: link uses a different local origin`);
            }
          }
        }

        const canonical = await page.evaluate(
          () => document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null
        );
        if (expectedThinLanding && status === 200) {
          const robots = await page.locator('meta[name="robots"]').getAttribute("content");
          expect(robots, `${path} must remain out of the index below its configured threshold`)
            .toMatch(/noindex/i);
        }
        if (canonical) {
          const canonicalUrl = new URL(canonical, base);
          const finalUrl = new URL(page.url());
          expect(canonicalUrl.origin, `${path} canonical origin`).toBe(base.origin);
          expect(canonicalUrl.pathname, `${path} canonical final path`).toBe(
            finalUrl.pathname
          );
          expect(canonicalUrl.search, `${path} canonical query`).toBe("");
        }
      }

      expect(violations, violations.join("\n")).toEqual([]);
      expect(foundInternalLinks.size).toBeGreaterThan(0);
    });

    test("desktop and mobile navigation expose the same destinations", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");
      const desktopDestinations = await page
        .locator("header nav a, header a")
        .evaluateAll((links) =>
          links
            .map((link) => (link as HTMLAnchorElement).pathname)
            .filter(Boolean)
        );

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const mobileDestinations = await page
        .locator("header a, body > nav a")
        .evaluateAll((links) =>
          links
            .map((link) => (link as HTMLAnchorElement).pathname)
            .filter(Boolean)
        );

      for (const destination of ["/tracks", "/license-overview"]) {
        expect(desktopDestinations).toContain(destination);
        expect(mobileDestinations).toContain(destination);
      }
      expect(mobileDestinations).toContain(role === "admin" ? "/admin" : "/dashboard");
    });

    test("wrong-role routes have an intentional response", async ({ page }) => {
      if (role === "buyer") {
        await page.goto("/dashboard/beats");
        await expect(page).toHaveURL(/\/unauthorized\?required=producer/);
        await expect(
          page.getByRole("heading", { name: "This account cannot open that page" })
        ).toBeVisible();
        const adminPage = await page.context().newPage();
        try {
          const adminResponse = await adminPage.goto("/admin");
          expect(adminResponse?.status()).toBe(404);
        } finally {
          await adminPage.close();
        }
      }

      if (role === "producer") {
        await page.goto("/dashboard/orders");
        await expect(page).toHaveURL(/\/unauthorized\?required=buyer/);
        await expect(
          page.getByRole("heading", { name: "This account cannot open that page" })
        ).toBeVisible();
        await expect(page.getByText(/This page is for buyer accounts/)).toBeVisible();
      }
    });
  });
}

test.describe("guest protected-route redirects", () => {
  test("preserves protected path and query for login return", async ({ page }) => {
    const response = await page.goto("/dashboard/orders?status=paid");
    expect([200, 307, 308]).toContain(response?.status());
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard%2Forders%3Fstatus%3Dpaid/);
  });
});
