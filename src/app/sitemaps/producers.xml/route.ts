import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { getPublicProducerSitemapEntries } from "@/server/catalog/repository";

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
  const producers = await getPublicProducerSitemapEntries();
  const entries = producers.map((producer) =>
    `<url><loc>${escapeXml(`${siteConfig.url}/producer/${producer.username}`)}</loc><lastmod>${producer.updatedAt.toISOString()}</lastmod></url>`
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
