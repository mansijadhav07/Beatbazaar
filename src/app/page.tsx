import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Music,
  ArrowRight,
  Disc3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const genres = [
    "Hip Hop",
    "Trap",
    "Boom Bap",
    "Drill",
    "R&B",
    "Afrobeat",
    "Lo-Fi",
    "Pop",
    "Punjabi",
    "Hindi Rap",
  ];

  const suggestedSearches = [
    "drill type beat",
    "140 bpm trap",
    "boom bap 90 bpm",
    "lo-fi chill",
    "punjabi type beat",
    "emotional guitar",
  ];

  const licenseTiers = [
    {
      title: "Free Download",
      subtitle: "Available on beats where the producer enables it",
      features: [
        "Check the track page for included files",
        "Read the producer's terms before downloading",
        "Usage and credit details vary by license",
      ],
      badge: "Audition",
    },
    {
      title: "Non-Exclusive License",
      subtitle: "Producer-defined terms and pricing",
      features: [
        "Included files are listed on each track",
        "Review usage limits before purchase",
        "A PDF snapshot of the order terms is available",
      ],
      badge: "Producer-defined",
    },
    {
      title: "Exclusive License",
      subtitle: "Available while the beat is listed for sale",
      features: [
        "Included files are listed on the track page",
        "Purchase removes the beat from sale",
        "Read the producer's exclusive terms before purchase",
      ],
      badge: "Exclusive",
    },
  ];

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* 1. Hero Search Area */}
      <section className="border-b border-border bg-surface-muted py-12 sm:py-16">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <p className="inline-block border border-border bg-surface px-3 py-2 text-sm text-ink">
              Test mode only. No live payments or producer payouts are processed.
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink leading-tight">
              Buy and sell licensed beats from independent producers.
            </h1>
            <p className="text-sm sm:text-base text-steel-dark leading-relaxed">
              Every beat is free to audition with watermarked preview audio.
              Review the producer&apos;s license options, included files, and terms
              before checkout. After payment is verified, download access and a
              PDF snapshot of the order terms are available.
            </p>
          </div>

          {/* Search Bar Input */}
          <form
            action="/tracks"
            method="GET"
            className="mt-6 flex flex-col sm:flex-row gap-2 max-w-3xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
              <Input
                name="q"
                type="text"
                placeholder="Search by title, producer, mood, or keyword (e.g. dark drill, boom bap)..."
                className="pl-9 bg-surface"
              />
            </div>
            <div className="flex gap-2">
              <Link href="/tracks">
                <Button
                  type="submit"
                  className="w-full sm:w-auto gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span>Search Beats</span>
                </Button>
              </Link>
            </div>
          </form>

          {/* Suggested Searches */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-steel-dark">
            <span className="font-medium text-ink">Popular:</span>
            {suggestedSearches.map((term) => (
              <Link
                key={term}
                href={`/tracks?q=${encodeURIComponent(term)}`}
                className="rounded border border-border bg-surface px-2.5 py-1 text-steel-dark hover:border-steel hover:text-ink transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Genre Directory */}
      <section id="genres" className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              Browse Beats by Genre
            </h2>
            <p className="text-xs sm:text-sm text-steel-dark">
              Explore catalog additions across major production styles.
            </p>
          </div>
          <Link
            href="/tracks"
            className="text-xs sm:text-sm font-semibold text-brass-dark hover:underline inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {genres.map((genre) => (
            <Link
              key={genre}
              href={`/tracks?genre=${encodeURIComponent(genre)}`}
              className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3.5 py-2 text-xs sm:text-sm font-medium text-ink hover:border-steel hover:bg-surface-muted transition-colors"
            >
              <Disc3 className="h-3.5 w-3.5 text-steel" />
              <span>{genre}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Catalog Listing Empty State */}
      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 w-full">
        <div className="border-b border-border pb-3">
          <h2 className="text-lg sm:text-xl font-bold text-ink">
            Trending Beats
          </h2>
          <p className="text-xs sm:text-sm text-steel-dark">
            Recent verified additions to the Beatbazaar catalog.
          </p>
        </div>

        {/* Real Structure Empty State */}
        <div className="mt-6 rounded border border-dashed border-border bg-surface-muted p-8 text-center sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-surface text-steel">
            <Music className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm sm:text-base font-semibold text-ink">
            No live tracks available yet
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-steel-dark max-w-md mx-auto">
            Producer uploads are pending ingestion. Once producers publish tracks with stems,
            watermarked previews will populate this section automatically.
          </p>
          <div className="mt-4">
            <Link href="/login?intent=producer">
              <Button size="sm" variant="outline">
                Register as a Producer to Upload Beats
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Three-Step Process Explainer */}
      <section className="border-y border-border bg-surface-muted py-12">
        <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              How Beatbazaar Works
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-steel-dark">
              Transparent music licensing with instantaneous audio file delivery.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded border border-border bg-surface p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-muted text-ink font-bold text-sm">
                1
              </div>
              <h3 className="text-sm font-semibold text-ink">
                Find your production style
              </h3>
              <p className="text-xs text-steel-dark leading-relaxed">
                Filter by BPM, musical key, genre, or mood tags. Every beat offers
                free watermarked playback with interactive waveform seeking.
              </p>
            </div>

            <div className="rounded border border-border bg-surface p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-muted text-ink font-bold text-sm">
                2
              </div>
              <h3 className="text-sm font-semibold text-ink">
                Select your license tier
              </h3>
              <p className="text-xs text-steel-dark leading-relaxed">
                Review usage rights, distribution limits, and included files before purchase.
                Prices are shown upfront in INR. Applicable fees and tax treatment are
                subject to configuration and legal review.
              </p>
            </div>

            <div className="rounded border border-border bg-surface p-5 space-y-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-muted text-ink font-bold text-sm">
                3
              </div>
              <h3 className="text-sm font-semibold text-ink">
                Download after payment verification
              </h3>
              <p className="text-xs text-steel-dark leading-relaxed">
                Payment is processed through Razorpay test checkout. After our
                webhook verifies payment, download access and a PDF snapshot of
                the order terms are available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. License Tiers Comparison */}
      <section id="licenses" className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-xl">
          <h2 className="text-lg sm:text-xl font-bold text-ink">
            License Tier Overview
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-steel-dark">
            Producers set their own prices for each tier. Terms are fixed into the order snapshot.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {licenseTiers.map((tier) => (
            <Card key={tier.title} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-muted text-steel-dark border border-border">
                    {tier.badge}
                  </span>
                </div>
                <CardTitle className="text-base sm:text-lg mt-2">
                  {tier.title}
                </CardTitle>
                <p className="text-xs text-steel-dark">
                  {tier.subtitle}
                </p>
              </CardHeader>

              <CardContent className="space-y-2">
                <ul className="space-y-2 text-xs text-ink">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-steel flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. Producer Call to Action */}
      <section className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 mb-8 w-full">
        <div className="rounded border border-border bg-ink text-surface p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-surface">
              Produce music? Sell your beats directly on Beatbazaar.
            </h2>
            <p className="text-xs sm:text-sm text-mist max-w-lg leading-relaxed">
              Upload audio and optional stems. We generate watermarked previews
              and provide checkout, download access, and a PDF snapshot of
              license terms after payment verification.
            </p>
          </div>
          <Link href="/login?intent=producer">
            <Button size="lg" className="whitespace-nowrap">
              Register as Producer
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
