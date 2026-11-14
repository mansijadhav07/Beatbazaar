import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getIndexableLandingSitemapEntries } from "@/server/catalog/repository";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const landings = await getIndexableLandingSitemapEntries();
  const entries = landings.map((landing) =>
    `<url><loc>${escapeXml(`${siteConfig.url}${landing.path}`)}</loc><lastmod>${landing.updatedAt.toISOString()}</lastmod></url>`
  ).join("");
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
