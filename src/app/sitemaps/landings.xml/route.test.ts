import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/server/catalog/repository", () => ({
  getIndexableLandingSitemapEntries: vi.fn(),
}));

import { getIndexableLandingSitemapEntries } from "@/server/catalog/repository";

describe("indexable landing sitemap", () => {
  it("includes only the repository's threshold-qualified landing pages", async () => {
    vi.mocked(getIndexableLandingSitemapEntries).mockResolvedValue([
      { path: "/beats/genre/fixture-genre", updatedAt: new Date("2026-01-02T00:00:00.000Z") },
      { path: "/producers/in/fixture-state", updatedAt: new Date("2026-01-03T00:00:00.000Z") },
    ]);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("/beats/genre/fixture-genre");
    expect(body).toContain("/producers/in/fixture-state");
    expect(body).toContain("2026-01-02T00:00:00.000Z");
  });
});
