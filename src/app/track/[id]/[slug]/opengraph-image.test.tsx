import { afterEach, describe, expect, it, vi } from "vitest";
import { siteConfig } from "@/config/site";
import OpenGraphImage, { size } from "./opengraph-image";

vi.mock("@/server/catalog/repository", () => ({
  getTrackById: vi.fn(),
}));

import { getTrackById } from "@/server/catalog/repository";

const mockGetTrackById = vi.mocked(getTrackById);

function track(coverKey?: string) {
  return {
    _id: "507f1f77bcf86cd799439011",
    status: "live",
    title: "Test-only track",
    slug: "test-only-track",
    producerName: "Test-only producer",
    genre: "Hip Hop",
    bpm: 90,
    coverKey,
    licenses: [
      {
        enabled: true,
        termsText: "Fixture terms.",
        price: { amount: 1500, currency: "INR" },
      },
    ],
  };
}

describe("track Open Graph image endpoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns a cacheable PNG at the required dimensions for a track cover", async () => {
    mockGetTrackById.mockResolvedValue(track("covers/test.png") as never);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgqkAAAAASUVORK5CYII=",
          "base64"
        ),
          { headers: { "content-type": "image/png" } }
        )
      )
    );

    const response = await OpenGraphImage({
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011", slug: "test-only-track" }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(view.getUint32(16)).toBe(size.width);
    expect(view.getUint32(20)).toBe(size.height);
    expect(fetch).toHaveBeenCalledWith(
      `${siteConfig.publicR2Domain}/covers/test.png`,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("renders the branded fallback when a track has no cover", async () => {
    mockGetTrackById.mockResolvedValue(track() as never);
    const response = await OpenGraphImage({
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011", slug: "test-only-track" }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(response.headers.get("content-type")).toContain("image/png");
    expect(view.getUint32(16)).toBe(size.width);
    expect(view.getUint32(20)).toBe(size.height);
  });
});
