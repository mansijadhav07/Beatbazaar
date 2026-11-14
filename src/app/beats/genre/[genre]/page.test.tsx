import { describe, expect, it, vi } from "vitest";
import GenreLandingPage, { generateMetadata } from "./page";
import type { PublicLandingSnapshot } from "@/lib/public-catalog";

vi.mock("@/server/catalog/repository", () => ({
  getPublicLandingPage: vi.fn(),
}));

import { getPublicLandingPage } from "@/server/catalog/repository";

const fixture: PublicLandingSnapshot = {
  kind: "genre",
  label: "Fixture Genre",
  path: "/beats/genre/fixture-genre",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  trackCount: 2,
  producerCount: 1,
  threshold: 5,
  tracks: [],
  producers: [],
  commonGenres: [],
  commonLanguages: [],
};

describe("genre landing page metadata", () => {
  it("returns a rendered page with noindex below threshold and a canonical", async () => {
    vi.mocked(getPublicLandingPage).mockResolvedValue(fixture);
    const metadata = await generateMetadata({
      params: Promise.resolve({ genre: "fixture-genre" }),
    });
    const page = await GenreLandingPage({
      params: Promise.resolve({ genre: "fixture-genre" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(fixture.path);
    expect(page).toBeDefined();
  });

  it("allows indexing at the configured threshold", async () => {
    vi.mocked(getPublicLandingPage).mockResolvedValue({
      ...fixture,
      trackCount: fixture.threshold,
    });
    const metadata = await generateMetadata({
      params: Promise.resolve({ genre: "fixture-genre" }),
    });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(fixture.path);
  });
});
