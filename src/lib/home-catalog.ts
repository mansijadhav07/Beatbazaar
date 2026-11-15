import type { CatalogCount } from "@/lib/public-catalog";

export interface HomeCatalogSections<TTrack> {
  featured: TTrack[];
  trending: TTrack[];
  newest: TTrack[];
  genres: CatalogCount[];
}

export interface VisibleHomeSection<TTrack> {
  title: string;
  tracks: TTrack[];
}

export function getVisibleHomeSections<TTrack>(
  catalog: HomeCatalogSections<TTrack>
): VisibleHomeSection<TTrack>[] {
  return [
    { title: "Featured beats", tracks: catalog.featured },
    { title: "Trending this week", tracks: catalog.trending },
    { title: "Recently published", tracks: catalog.newest },
  ].filter((section) => section.tracks.length > 0);
}
