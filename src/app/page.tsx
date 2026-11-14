import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import {
  getProducerDirectoryEntries,
  getPublicHomeCatalog,
} from "@/server/catalog/repository";
import type { ITrack } from "@/server/db/models/Track";
import { slugifyPublicLabel } from "@/lib/public-catalog";
import { getVisibleHomeSections } from "@/lib/home-catalog";

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
    <section aria-labelledby={`${slugifyPublicLabel(title)}-heading`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2
          id={`${slugifyPublicLabel(title)}-heading`}
          className="text-xl font-semibold text-ink sm:text-2xl"
        >
          {title}
        </h2>
        <Link
          href="/tracks"
          className="min-h-11 inline-flex items-center text-sm font-medium text-steel-dark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
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

  return (
    <div className="mx-auto flex w-full max-w-container flex-col gap-12 px-4 py-8 sm:gap-16 sm:px-6 lg:px-8">
      <section
        aria-labelledby="home-title"
        className="grid gap-6 bg-surface-muted px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-end"
      >
        <div className="max-w-2xl">
          <h1 id="home-title" className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Find a beat for your next record
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink">
            Preview published beats, compare producer-defined licenses, and review included files before checkout.
          </p>
        </div>
        <form action="/tracks" method="GET" className="flex items-center gap-2">
          <label htmlFor="home-search" className="sr-only">
            Search beats by title, producer, mood, or genre
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-dark"
            />
            <Input
              id="home-search"
              name="q"
              type="search"
              placeholder="Search beats, producers, or moods"
              className="min-h-11 bg-surface pl-9"
            />
          </div>
          <button
            type="submit"
            className="min-h-11 shrink-0 bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
          >
            Search
          </button>
        </form>
      </section>

      {getVisibleHomeSections(catalog).map((section, index) => (
        <CatalogSection
          key={section.title}
          title={section.title}
          tracks={toCards(section.tracks)}
          prioritizeFirst={index === 0}
        />
      ))}

      {catalog.genres.length > 0 && (
        <section aria-labelledby="home-genres-heading">
          <h2 id="home-genres-heading" className="mb-4 text-xl font-semibold text-ink sm:text-2xl">
            Browse genres
          </h2>
          <ul className="flex flex-wrap gap-2">
            {catalog.genres.map(({ label, count }) => (
              <li key={label}>
                <Link
                  href={`/beats/genre/${slugifyPublicLabel(label)}`}
                  className="inline-flex min-h-11 items-center gap-2 bg-surface-muted px-3 text-sm text-ink hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
                >
                  <span>{label}</span>
                  <span className="text-steel-dark">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
