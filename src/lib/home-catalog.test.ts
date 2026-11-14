import { describe, expect, it } from "vitest";
import { getVisibleHomeSections } from "./home-catalog";

describe("home catalog sections", () => {
  it("hides every catalog section when the database has no published data", () => {
    expect(
      getVisibleHomeSections({
        featured: [],
        trending: [],
        newest: [],
        genres: [],
      })
    ).toEqual([]);
  });

  it("shows only populated sections and retains real genre counts", () => {
    const fixtureTrack = { id: "fixture-track", title: "Test fixture only" };
    const catalog = {
      featured: [],
      trending: [fixtureTrack],
      newest: [fixtureTrack],
      genres: [{ label: "Fixture genre", count: 1 }],
    };

    expect(getVisibleHomeSections(catalog)).toEqual([
      { title: "Trending this week", tracks: [fixtureTrack] },
      { title: "Recently published", tracks: [fixtureTrack] },
    ]);
    expect(catalog.genres).toEqual([{ label: "Fixture genre", count: 1 }]);
  });
});
