import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getPublicTrackSitemapEntries } from "@/server/catalog/repository";

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
  const tracks = await getPublicTrackSitemapEntries();
  const entries = tracks
    .map(
      (track) =>
        `<url><loc>${escapeXml(`${siteConfig.url}/track/${track.id}/${track.slug}`)}</loc><lastmod>${track.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    )
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
