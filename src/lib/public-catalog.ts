export interface CatalogCount {
  label: string;
  count: number;
}

export interface PublicLandingTrack {
  id: string;
  title: string;
  slug: string;
  genre: string;
  language: string;
  bpm: number;
  playCount: number;
  coverKey?: string | null;
  producerId: string;
  producerName?: string;
  producerUsername?: string;
  previewKey?: string;
  waveform: number[];
  lowestPriceAmount: number | null;
}

export interface PublicLandingProducer {
  username: string;
  displayName: string;
  city: string;
  state: string;
}

export interface PublicLandingSnapshot {
  kind: "genre" | "language" | "state" | "city";
  label: string;
  path: string;
  updatedAt: Date;
  trackCount: number;
  producerCount: number;
  threshold: number;
  tracks: PublicLandingTrack[];
  producers: PublicLandingProducer[];
  commonGenres: CatalogCount[];
  commonLanguages: CatalogCount[];
}

export function slugifyPublicLabel(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getProducerLocationCitySlug(
  city: string,
  stateSlugs: ReadonlySet<string>
): string {
  const citySlug = slugifyPublicLabel(city);
  return stateSlugs.has(citySlug) ? `${citySlug}-city` : citySlug;
}

export function isPublicLandingIndexable(
  count: number,
  threshold: number
): boolean {
  return Number.isInteger(count) && count >= threshold && threshold > 0;
}

export function filterIndexableLandingSitemapEntries<
  T extends { count: number; threshold: number },
>(entries: T[]): T[] {
  return entries.filter((entry) =>
    isPublicLandingIndexable(entry.count, entry.threshold)
  );
}

export function buildLandingJsonLd(snapshot: PublicLandingSnapshot, siteUrl: string) {
  const canonicalUrl = `${siteUrl}${snapshot.path}`;
  const producerPage = snapshot.path.startsWith("/producers/");
  const title = producerPage
    ? `Producers in ${snapshot.label}`
    : `${snapshot.label} beats`;
  const listItems = producerPage
    ? snapshot.producers.map((producer, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: producer.displayName,
        url: `${siteUrl}/producer/${producer.username}`,
      }))
    : snapshot.tracks.map((track, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: track.title,
        url: `${siteUrl}/track/${track.id}/${track.slug}`,
      }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: producerPage ? "Producers in India" : "Beats",
              ...(!producerPage ? { item: `${siteUrl}/tracks` } : {}),
          },
          { "@type": "ListItem", position: 3, name: title, item: canonicalUrl },
        ],
      },
      {
        "@type": "ItemList",
        name: title,
        numberOfItems: producerPage ? snapshot.producerCount : snapshot.trackCount,
        itemListElement: listItems,
      },
    ],
  };
}

export function isProducerProfileIndexable(liveTrackCount: number): boolean {
  return liveTrackCount > 0;
}

export function filterProducerSitemapEntries<
  T extends { liveTrackCount: number },
>(entries: T[]): T[] {
  return entries.filter((entry) => isProducerProfileIndexable(entry.liveTrackCount));
}

export function getPublicLandingRobots(snapshot: PublicLandingSnapshot) {
  const count = snapshot.path.startsWith("/producers/")
    ? snapshot.producerCount
    : snapshot.trackCount;
  return isPublicLandingIndexable(count, snapshot.threshold)
    ? { index: true, follow: true }
    : { index: false, follow: true };
}

export function buildProducerJsonLd(
  input: {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl?: string | null;
    location: { country: string; state: string; city: string };
  },
  siteUrl: string
) {
  const profileUrl = `${siteUrl}/producer/${input.username}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        url: profileUrl,
        mainEntity: {
          "@type": "Person",
          name: input.displayName,
          description: input.bio,
          url: profileUrl,
          ...(input.avatarUrl ? { image: input.avatarUrl } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: input.location.city,
            addressRegion: input.location.state,
            addressCountry: input.location.country,
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tracks",
            item: `${siteUrl}/tracks`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.displayName,
            item: profileUrl,
          },
        ],
      },
    ],
  };
}
