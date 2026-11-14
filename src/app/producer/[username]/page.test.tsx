import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("@/server/catalog/repository", () => ({
  getPublicProducerPage: vi.fn(),
}));

import { getPublicProducerPage } from "@/server/catalog/repository";

describe("producer profile metadata", () => {
  it("marks profiles with no live beats noindex while keeping a canonical", async () => {
    vi.mocked(getPublicProducerPage).mockResolvedValue({
      profile: {
        username: "fixture-producer",
        displayName: "Fixture Producer",
        bio: "Fixture profile for this test.",
        location: { country: "India", state: "Maharashtra", city: "Pune" },
        verified: false,
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      tracks: [],
      trackCount: 0,
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ username: "fixture-producer" }),
    });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "http://localhost:3000/producer/fixture-producer"
    );
  });
});
