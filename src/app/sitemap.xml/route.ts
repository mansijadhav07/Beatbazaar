import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const sitemapPaths = [
  "/sitemaps/static.xml",
  "/sitemaps/tracks.xml",
  "/sitemaps/producers.xml",
  "/sitemaps/landings.xml",
];

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const entries = sitemapPaths
    .map(
      (path) =>
        `<sitemap><loc>${escapeXml(`${siteConfig.url}${path}`)}</loc></sitemap>`
    )
    .join("");
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=300",
      },
    }
  );
}
