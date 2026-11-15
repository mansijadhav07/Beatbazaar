"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const GENRES = ["All Genres", "Trap", "Hip Hop", "Boom Bap", "Drill", "R&B", "Pop", "Afrobeats", "Desi Hip Hop"];
const KEYS = ["All Keys", "C Minor", "C Major", "D Minor", "D Major", "E Minor", "F Minor", "G Minor", "A Minor", "B Minor"];
const SORTS = [
  { label: "Trending", value: "trending" },
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
];

export function FilterSidebar({ totalResults }: { totalResults: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);

  const currentKey = searchParams.get("key") || "All Keys";
  const currentSort = searchParams.get("sort") || "trending";
  const currentMinBpm = searchParams.get("minBpm") || "";
  const currentMaxBpm = searchParams.get("maxBpm") || "";
  const currentFreeOnly = searchParams.get("freeOnly") === "true";

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All Genres" && value !== "All Keys") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset page on filter update
    router.push(`/tracks?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push("/tracks");
    setMobileOpen(false);
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Sort Option */}
      <div>
        <label htmlFor="track-sort" className="mb-2 block text-sm font-bold text-ink">
          Sort By
        </label>
        <Select
          id="track-sort"
          value={currentSort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Genre Filter */}
      <div>
        <p className="mb-2 text-sm font-bold text-ink">
          Genre
        </p>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g) => {
            const active = (g === "All Genres" && !searchParams.get("genre")) || searchParams.get("genre") === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => updateParam("genre", g === "All Genres" ? null : g)}
                className={`min-h-11 rounded px-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink text-surface"
                    : "bg-surface-muted text-steel-dark hover:text-ink hover:bg-border"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* BPM Range Filter */}
      <div>
        <p className="mb-2 text-sm font-bold text-ink">
          BPM Range
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="Minimum BPM"
            placeholder="Min"
            min={40}
            max={280}
            defaultValue={currentMinBpm}
            onBlur={(e) => updateParam("minBpm", e.target.value || null)}
            className="min-h-11 w-full rounded border border-border bg-surface px-2 text-base text-ink focus:border-brass focus:outline-none"
          />
          <span aria-hidden="true" className="text-steel-dark text-xs">:</span>
          <input
            type="number"
            aria-label="Maximum BPM"
            placeholder="Max"
            min={40}
            max={280}
            defaultValue={currentMaxBpm}
            onBlur={(e) => updateParam("maxBpm", e.target.value || null)}
            className="min-h-11 w-full rounded border border-border bg-surface px-2 text-base text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      {/* Musical Key Filter */}
      <div>
        <label htmlFor="track-key" className="mb-2 block text-sm font-bold text-ink">
          Key
        </label>
        <Select
          id="track-key"
          value={currentKey}
          onChange={(e) => updateParam("key", e.target.value === "All Keys" ? null : e.target.value)}
        >
          {KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </div>

      {/* Free Only Toggle */}
      <div className="pt-2 border-t border-border">
        <label className="flex min-h-11 items-center gap-2 cursor-pointer text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={currentFreeOnly}
            onChange={(e) => updateParam("freeOnly", e.target.checked ? "true" : null)}
            className="rounded border-border text-steel-dark focus:ring-steel"
          />
          Free Downloads Only
        </label>
      </div>

      {/* Reset */}
      <Button
        variant="outline"
        size="sm"
        onClick={clearAllFilters}
        className="min-h-11 w-full text-sm text-steel-dark hover:text-ink"
      >
        Reset All Filters
      </Button>
    </div>
  );

  return (
    <>
      {/* Desktop Filter Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-20 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-steel" />
              <span>Filters</span>
            </span>
            <span className="text-xs text-steel-dark">{totalResults} beats</span>
          </div>
          {filterContent}
        </div>
      </aside>

      {/* Mobile Filter Button and Bottom Sheet */}
      <div className="lg:hidden mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="min-h-11 flex items-center gap-2 text-sm"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filters ({totalResults})</span>
        </Button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
          <div
            className="w-full rounded-t-xl bg-surface border-t border-border p-5 max-h-[85dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)] animate-in slide-in-from-bottom"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-sm font-bold text-ink">Filter Catalog</h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-steel hover:text-ink p-1"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
            <div className="mt-4 pt-3 border-t border-border">
              <Button onClick={() => setMobileOpen(false)} className="w-full text-xs">
                View {totalResults} Beats
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
