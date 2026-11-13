import React from "react";
import type { Metadata } from "next";
import { findPublicTracks } from "@/server/catalog/repository";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { SearchBar } from "@/components/catalog/SearchBar";
import { siteConfig } from "@/config/site";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    language?: string;
    minBpm?: string;
    maxBpm?: string;
    key?: string;
    mood?: string;
    freeOnly?: string;
    sort?: "trending" | "newest" | "price_asc";
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: BrowsePageProps): Promise<Metadata> {
  const params = await searchParams;
  const isDeepFilter =
    Boolean(params.minBpm) ||
    Boolean(params.maxBpm) ||
    Boolean(params.key) ||
    Boolean(params.mood) ||
    Boolean(params.page && Number(params.page) > 1);

  // CLAUDE.md section 8: Deep filter permutations use noindex, follow to preserve crawl equity
  const robots = isDeepFilter
    ? { index: false, follow: true }
    : { index: true, follow: true };

  const genreTitle = params.genre ? `${params.genre} Beats` : "Browse Beats and Instrumentals";

  return {
    title: `${genreTitle} | ${siteConfig.name}`,
    description: `Browse licensed beats and instrumentals. Filter by genre, BPM, key, and mood on ${siteConfig.name}.`,
    robots,
    alternates: {
      canonical: `${siteConfig.url}/tracks`,
    },
  };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;

  const catalogResult = await findPublicTracks({
    q: params.q,
    genre: params.genre,
    language: params.language,
    minBpm: params.minBpm ? Number(params.minBpm) : undefined,
    maxBpm: params.maxBpm ? Number(params.maxBpm) : undefined,
    key: params.key,
    mood: params.mood,
    freeOnly: params.freeOnly === "true",
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
    limit: 20,
  });

  const tracks: BeatCardTrack[] = catalogResult.tracks.map((t) => {
    const previewFile = t.files.find((f) => f.kind === "preview");
    // Find lowest active license price
    const enabledLicenses = t.licenses.filter((l) => l.enabled);
    const lowestLicense = enabledLicenses.sort((a, b) => a.price.amount - b.price.amount)[0];

    return {
      id: t._id.toString(),
      title: t.title,
      slug: t.slug,
      genre: t.genre,
      bpm: t.bpm,
      coverKey: t.coverKey,
      producerName: t.producerName,
      waveform: t.waveform,
      previewKey: previewFile?.r2Key,
      lowestPriceAmount: lowestLicense ? lowestLicense.price.amount : 0,
      lowestPriceCurrency: lowestLicense ? lowestLicense.price.currency : "INR",
      playCount: t.playCount,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {params.genre ? `${params.genre} Beats` : "Explore Beats"}
          </h1>
          <p className="text-xs text-steel mt-1">
            Royalty-free commercial licenses, high-resolution audio stems, and direct producer support.
          </p>
        </div>

        <SearchBar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <FilterSidebar totalResults={catalogResult.total} />

        <div className="flex-1 w-full min-w-0">
          {tracks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center bg-surface-muted/30">
              <h3 className="text-sm font-semibold text-ink">No beats found</h3>
              <p className="text-xs text-steel mt-1 max-w-sm mx-auto">
                No published beats matched your current search filters. Try adjusting your BPM range, key, or genre.
              </p>
              <div className="mt-4">
                <Link
                  href="/tracks"
                  className="inline-flex items-center justify-center rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted transition-colors"
                >
                  Clear all filters
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Responsive Beat Grid: 2 cols mobile, 3 tablet, up to 5 desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {tracks.map((track) => (
                  <BeatCard key={track.id} track={track} />
                ))}
              </div>

              {/* Pagination */}
              {catalogResult.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2 pt-6 border-t border-border">
                  {Array.from({ length: catalogResult.totalPages }, (_, i) => i + 1).map((p) => {
                    const isCurrent = p === catalogResult.page;
                    const queryParams = new URLSearchParams(params as Record<string, string>);
                    queryParams.set("page", String(p));

                    return (
                      <Link
                        key={p}
                        href={`/tracks?${queryParams.toString()}`}
                        className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors ${
                          isCurrent
                            ? "bg-ink text-surface"
                            : "bg-surface border border-border text-steel hover:text-ink hover:bg-surface-muted"
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
