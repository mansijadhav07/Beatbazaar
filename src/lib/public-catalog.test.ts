import { describe, expect, it } from "vitest";
import {
  buildLandingJsonLd,
  buildProducerJsonLd,
  filterIndexableLandingSitemapEntries,
  filterProducerSitemapEntries,
  getProducerLocationCitySlug,
  getPublicLandingRobots,
  isProducerProfileIndexable,
  isPublicLandingIndexable,
  slugifyPublicLabel,
  type PublicLandingSnapshot,
} from "./public-catalog";

const fixture: PublicLandingSnapshot = {
  kind: "genre",
  label: "Boom Bap",
  path: "/beats/genre/boom-bap",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  trackCount: 6,
  producerCount: 3,
  threshold: 5,
  tracks: [
    {
      id: "507f1f77bcf86cd799439011",
      title: "Test Fixture Beat",
      slug: "test-fixture-beat",
      genre: "Boom Bap",
      language: "Hindi",
      bpm: 90,
      playCount: 0,
      producerId: "producer-test",
      producerUsername: "sample-producer",
      waveform: [],
      lowestPriceAmount: null,
    },
  ],
  producers: [],
  commonGenres: [{ label: "Boom Bap", count: 6 }],
  commonLanguages: [{ label: "Hindi", count: 4 }],
};

describe("public catalog landing policy", () => {
  it("keeps below-threshold pages noindex and out of the indexable sitemap set", () => {
    const belowThreshold = { ...fixture, trackCount: 4 };
    expect(getPublicLandingRobots(belowThreshold)).toEqual({ index: false, follow: true });
    expect(isPublicLandingIndexable(belowThreshold.trackCount, belowThreshold.threshold))
      .toBe(false);
    expect(isPublicLandingIndexable(0, belowThreshold.threshold)).toBe(false);
    expect(
      filterIndexableLandingSitemapEntries([
        { path: belowThreshold.path, count: belowThreshold.trackCount, threshold: belowThreshold.threshold },
      ])
    ).toEqual([]);
  });

  it("indexes pages at or above the configured threshold", () => {
    expect(getPublicLandingRobots(fixture)).toEqual({ index: true, follow: true });
    expect(isPublicLandingIndexable(fixture.trackCount, fixture.threshold)).toBe(true);
    expect(isPublicLandingIndexable(fixture.threshold, fixture.threshold)).toBe(true);
    expect(
      filterIndexableLandingSitemapEntries([
        { path: fixture.path, count: fixture.trackCount, threshold: fixture.threshold },
      ])
    ).toEqual([
      { path: fixture.path, count: fixture.trackCount, threshold: fixture.threshold },
    ]);
  });

  it("includes derived catalog entries and breadcrumbs in structured data", () => {
    const data = buildLandingJsonLd(fixture, "https://beatbazaar.example");
    const graph = data["@graph"];

    expect(graph.map((entry) => entry["@type"])).toEqual([
      "BreadcrumbList",
      "ItemList",
    ]);
    expect(graph[1].itemListElement[0]).toMatchObject({
      name: "Test Fixture Beat",
      url: "https://beatbazaar.example/track/507f1f77bcf86cd799439011/test-fixture-beat",
    });
  });

  it("only indexes producer profiles that have live tracks", () => {
    expect(isProducerProfileIndexable(0)).toBe(false);
    expect(isProducerProfileIndexable(1)).toBe(true);
    expect(
      filterProducerSitemapEntries([
        { username: "fixture-without-live-beats", liveTrackCount: 0 },
      ])
    ).toEqual([]);
    expect(
      filterProducerSitemapEntries([
        { username: "fixture-with-live-beats", liveTrackCount: 1 },
      ])
    ).toEqual([{ username: "fixture-with-live-beats", liveTrackCount: 1 }]);
  });

  it("emits ProfilePage and BreadcrumbList structured data for a producer", () => {
    const data = buildProducerJsonLd(
      {
        username: "sample-producer",
        displayName: "Sample Producer",
        bio: "Fixture profile used in this unit test.",
        location: { country: "India", state: "Maharashtra", city: "Pune" },
      },
      "https://beatbazaar.example"
    );
    expect(data["@graph"].map((item) => item["@type"])).toEqual([
      "ProfilePage",
      "BreadcrumbList",
    ]);
    expect(data["@graph"][0]!.mainEntity!.address).toMatchObject({
      addressLocality: "Pune",
      addressRegion: "Maharashtra",
      addressCountry: "India",
    });
  });

  it("normalizes real location and catalog labels to path slugs", () => {
    expect(slugifyPublicLabel("Maharashtra")).toBe("maharashtra");
    expect(slugifyPublicLabel("R&B / Soul")).toBe("r-b-soul");
  });

  it("disambiguates producer cities whose slugs match a state", () => {
    const stateSlugs = new Set(["delhi", "maharashtra"]);
    expect(getProducerLocationCitySlug("Delhi", stateSlugs)).toBe("delhi-city");
    expect(getProducerLocationCitySlug("Mumbai", stateSlugs)).toBe("mumbai");
  });
});
