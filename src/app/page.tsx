import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { siteConfig } from "@/config/site";
import {
  getProducerDirectoryEntries,
  getPublicHomeCatalog,
} from "@/server/catalog/repository";
import type { ITrack } from "@/server/db/models/Track";
import { slugifyPublicLabel } from "@/lib/public-catalog";
import { getVisibleHomeSections } from "@/lib/home-catalog";
import { WaveformMotif } from "@/components/brand/WaveformMotif";

export const metadata: Metadata = {
  title: `${siteConfig.name} | Licensed beats from independent producers`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

function toBeatCardTrack(
  track: ITrack,
  producerUsername?: string,
  producerName?: string
): BeatCardTrack {
  const license = track.licenses
    .filter(
      (item) =>
        item.enabled &&
        item.price.currency === "INR" &&
        item.termsText.trim()
    )
    .sort((left, right) => left.price.amount - right.price.amount)[0];
  return {
    id: track._id.toString(),
    title: track.title,
    slug: track.slug,
    genre: track.genre,
    bpm: track.bpm,
    coverKey: track.coverKey,
    producerName: producerName || track.producerName,
    producerUsername,
    waveform: track.waveform,
    previewKey: track.files.find((file) => file.kind === "preview")?.r2Key,
    lowestPriceAmount: license?.price.amount ?? null,
    lowestPriceCurrency: license?.price.currency ?? "INR",
    playCount: track.playCount,
  };
}

function CatalogSection({
  title,
  tracks,
  prioritizeFirst,
}: {
  title: string;
  tracks: BeatCardTrack[];
  prioritizeFirst: boolean;
}) {
  if (tracks.length === 0) return null;
  return (
    <ScrollReveal>
      <section
        aria-labelledby={`${slugifyPublicLabel(title)}-heading`}
        className="space-y-5"
      >
        <div className="flex items-end justify-between gap-4">
          <h2
            id={`${slugifyPublicLabel(title)}-heading`}
            className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl"
          >
            {title}
          </h2>
          <Link
            href="/tracks"
            className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-ink underline-offset-4 hover:underline"
          >
            Browse all beats
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tracks.map((track, index) => (
            <BeatCard
              key={track.id}
              track={track}
              priority={prioritizeFirst && index === 0}
            />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}

export default async function HomePage() {
  const catalog = await getPublicHomeCatalog();
  const allTracks = [
    ...catalog.featured,
    ...catalog.trending,
    ...catalog.newest,
  ];
  const producers = await getProducerDirectoryEntries(
    [...new Set(allTracks.map((track) => track.producerId))]
  );
  const toCards = (tracks: ITrack[]) =>
    tracks.map((track) => {
      const producer = producers.get(track.producerId);
      return toBeatCardTrack(track, producer?.username, producer?.displayName);
    });
  const featuredTrack = catalog.newest[0];
  const featuredProducer = featuredTrack
    ? producers.get(featuredTrack.producerId)
    : undefined;
  const featuredCard = featuredTrack
    ? toBeatCardTrack(
        featuredTrack,
        featuredProducer?.username,
        featuredProducer?.displayName
      )
    : null;

  return (
    <div className="mx-auto flex w-full max-w-container flex-col gap-14 px-4 py-6 sm:gap-20 sm:px-6 sm:py-10 lg:px-8">
      <section
        aria-labelledby="home-title"
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] lg:items-center lg:gap-12"
      >
        <div className="max-w-2xl py-2">
          <h1
            id="home-title"
            className="font-display text-[1.875rem] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-4xl lg:text-[2.75rem]"
          >
            Find a beat for your next record
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink">
            Preview producer-made beats, compare each license, and choose what fits your release.
          </p>
          <form action="/tracks" method="GET" className="mt-6 flex w-full max-w-xl items-center gap-2">
            <label htmlFor="home-search" className="sr-only">
              Search by genre, mood, artist, or type beat
            </label>
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-dark"
              />
              <Input
                id="home-search"
                name="q"
                type="search"
                placeholder="Genre, mood, artist, or type beat"
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.72fr)] items-end gap-3">
          {featuredCard ? (
            <div className="max-w-[22rem]">
              <BeatCard track={featuredCard} priority />
            </div>
          ) : (
            <EmptyState
              title="The catalog is getting started"
              description="Published beats will appear here as producers complete their listings."
            />
          )}
          <div className="h-28 min-w-0 sm:h-36">
            <WaveformMotif />
          </div>
        </div>
      </section>

      {getVisibleHomeSections(catalog).map((section, index) => (
        <CatalogSection
          key={section.title}
          title={section.title}
          tracks={toCards(section.tracks)}
          prioritizeFirst={index === 0}
        />
      ))}

      {catalog.genres.length > 0 ? (
        <ScrollReveal>
          <section aria-labelledby="home-genres-heading" className="bg-mist-light px-4 py-6 sm:px-8 sm:py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="home-genres-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Browse by genre
              </h2>
              <Link href="/tracks" className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline-offset-4 hover:underline">
                All beats
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">
              {catalog.genres.map(({ label, count }) => (
                <li key={label} className="border-t border-border">
                  <Link
                    href={`/beats/genre/${slugifyPublicLabel(label)}`}
                    className="flex min-h-14 items-center justify-between gap-2 py-2 text-sm font-medium text-ink hover:text-steel-dark"
                  >
                    <span>{label}</span>
                    <span className="font-data text-xs text-steel-dark">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </ScrollReveal>
      ) : null}

      <section aria-labelledby="home-how-heading" className="bg-ink px-5 py-8 text-white sm:px-8 sm:py-10">
        <h2 id="home-how-heading" className="font-display text-2xl font-semibold text-white sm:text-3xl">
          From preview to release
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-8">
          <li className="border-t border-white/25 pt-4">
            <h3 className="text-lg font-semibold">Find a sound</h3>
            <p className="mt-2 text-base leading-7 text-white/85">
              Search the catalog and listen to a beat preview.
            </p>
          </li>
          <li className="border-t border-white/25 pt-4">
            <h3 className="text-lg font-semibold">Read the license</h3>
            <p className="mt-2 text-base leading-7 text-white/85">
              Check the producer&apos;s terms, included files, and price.
            </p>
          </li>
          <li className="border-t border-white/25 pt-4">
            <h3 className="text-lg font-semibold">Download after checkout</h3>
            <p className="mt-2 text-base leading-7 text-white/85">
              Access eligible files from your order after payment is verified.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="home-license-heading" className="grid gap-6 lg:grid-cols-[minmax(14rem,0.75fr)_minmax(0,1.25fr)] lg:gap-12">
        <div>
          <h2 id="home-license-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Choose the license that fits
          </h2>
          <p className="mt-3 max-w-md text-base leading-7 text-steel-dark">
            Each producer sets the terms, included files, and price for each beat. Review the exact listing before checkout.
          </p>
        </div>
        <ul className="divide-y divide-border border-y border-border">
          {[
            ["Free", "No payment. Producer terms still apply."],
            ["Non-exclusive", "Files, price, and usage terms vary by beat."],
            ["Exclusive", "Availability changes when an exclusive sale is completed."],
          ].map(([tier, description]) => (
            <li key={tier} className="grid gap-1 py-4 sm:grid-cols-[minmax(9rem,0.6fr)_minmax(0,1fr)] sm:items-baseline sm:gap-6">
              <h3 className="text-lg font-semibold text-ink">{tier}</h3>
              <p className="text-base leading-7 text-steel-dark">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-producer-heading" className="grid gap-6 bg-mist-light px-5 py-7 sm:px-8 sm:py-9 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 id="home-producer-heading" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Put your next beat up for review
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-steel-dark">
            Producers can create a profile, upload a beat, and set its license options.
          </p>
        </div>
        <Button asChild>
          <Link href="/login?intent=producer">Start a producer account</Link>
        </Button>
      </section>
    </div>
  );
}
