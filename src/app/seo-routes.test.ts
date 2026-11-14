import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/catalog/repository", () => ({
  getPublicTrackSitemapEntries: vi.fn().mockResolvedValue([
    {
      id: "507f1f77bcf86cd799439011",
      slug: "quiet-beat",
      updatedAt: new Date("2026-03-01T10:00:00.000Z"),
    },
  ]),
}));

import { GET as getSitemapIndex } from "./sitemap.xml/route";
import { GET as getStaticSitemap } from "./sitemaps/static.xml/route";
import { GET as getTrackSitemap } from "./sitemaps/tracks.xml/route";
import robots from "./robots";
import manifest from "./manifest";

describe("SEO metadata routes", () => {
  it("returns a sitemap index split into static and track maps", async () => {
    const response = getSitemapIndex();
    const xml = await response.text();

    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(xml).toContain("/sitemaps/static.xml");
    expect(xml).toContain("/sitemaps/tracks.xml");
  });

  it("lists only published public support pages in the static sitemap", async () => {
    const xml = await (await getStaticSitemap()).text();

    expect(xml).toContain("/faq");
    expect(xml).toContain("/install");
    expect(xml).not.toContain("/terms");
    expect(xml).not.toContain("/privacy");
    expect(xml).not.toContain("/refunds");
  });

  it("lists live track URLs and last modified timestamps", async () => {
    const xml = await (await getTrackSitemap()).text();

    expect(xml).toContain("/track/507f1f77bcf86cd799439011/quiet-beat");
    expect(xml).toContain("<lastmod>2026-03-01T10:00:00.000Z</lastmod>");
  });

  it("blocks private routes and points crawlers to the sitemap index", () => {
    const result = robots();
    const disallowed = result.rules && !Array.isArray(result.rules)
      ? result.rules.disallow
      : [];

    expect(disallowed).toContain("/admin");
    expect(disallowed).toContain("/dashboard");
    expect(disallowed).toContain("/api");
    expect(result.sitemap).toContain("/sitemap.xml");
  });

  it("provides an install manifest with the project's light palette", () => {
    const result = manifest();

    expect(result.theme_color).toBe("#2C3947");
    expect(result.background_color).toBe("#E8EDF2");
    expect(result.icons?.[0].src).toBe("/apple-touch-icon.svg");
  });
});
