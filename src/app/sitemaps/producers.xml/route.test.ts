import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/server/catalog/repository", () => ({
  getPublicProducerSitemapEntries: vi.fn(),
}));

import { getPublicProducerSitemapEntries } from "@/server/catalog/repository";

describe("producer sitemap", () => {
  it("contains only producer profiles supplied by the live-track repository query", async () => {
    vi.mocked(getPublicProducerSitemapEntries).mockResolvedValue([
      { username: "fixture-producer", updatedAt: new Date("2026-01-05T00:00:00.000Z") },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("/producer/fixture-producer");
    expect(body).toContain("2026-01-05T00:00:00.000Z");
  });
});
