import Link from "next/link";
import { Search, Music, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TracksPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb / Back Link */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-steel-dark hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Page Title & Search Bar */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Browse Beat Catalog
        </h1>
        <p className="mt-1 text-sm text-steel-dark">
          Search beats by genre, BPM range, and mood tags. Every track includes free watermarked auditioning.
        </p>

        {/* Filter Toolbar */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
            <Input
              type="text"
              placeholder="Filter by title, producer, or keyword..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Filter by genre"
              className="h-11 sm:h-10 rounded border border-border bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-steel"
              defaultValue="all"
            >
              <option value="all">All Genres</option>
              <option value="hip-hop">Hip Hop</option>
              <option value="trap">Trap</option>
              <option value="boom-bap">Boom Bap</option>
              <option value="drill">Drill</option>
              <option value="rnb">R&B</option>
              <option value="lo-fi">Lo-Fi</option>
            </select>
            <select
              aria-label="Sort tracks"
              className="h-11 sm:h-10 rounded border border-border bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-steel"
              defaultValue="trending"
            >
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Empty State */}
      <div className="mt-12 rounded border border-dashed border-border bg-surface-muted p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-surface text-steel">
          <Music className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink">
          Catalog is empty
        </h2>
        <p className="mt-1 text-sm text-steel-dark max-w-md mx-auto">
          No live tracks match your criteria. When producer tracks are uploaded and verified,
          they will appear here with price tiers and waveform audio players.
        </p>
        <div className="mt-6">
          <Link href="/login?intent=producer">
            <Button size="sm">
              Upload the First Beat
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

