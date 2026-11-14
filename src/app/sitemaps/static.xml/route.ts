import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const publicPaths = [
  "",
  "/tracks",
  "/faq",
  "/help",
  "/install",
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
  const paths = siteConfig.supportEmail
    ? [...publicPaths, "/contact"]
    : publicPaths;
  const entries = paths
    .map((path) => {
      const priority = path === "" ? "1.0" : path === "/tracks" ? "0.9" : "0.4";
      return `<url><loc>${escapeXml(`${siteConfig.url}${path}`)}</loc><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
    })
    .join("");
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=300",
      },
    }
  );
}
