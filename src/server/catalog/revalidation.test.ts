import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  revalidatePublicProducerProfile,
  revalidatePublicTrack,
} from "./revalidation";

describe("public catalog revalidation", () => {
  beforeEach(() => vi.mocked(revalidatePath).mockClear());

  it("revalidates track, catalog, and landing routes after moderation or sale", () => {
    revalidatePublicTrack("track-id", "track-slug");
    expect(revalidatePath).toHaveBeenCalledWith("/track/track-id/track-slug");
    expect(revalidatePath).toHaveBeenCalledWith("/tracks");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemaps/tracks.xml");
    expect(revalidatePath).toHaveBeenCalledWith("/beats/genre/[genre]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/beats/in/[city]", "page");
  });

  it("revalidates both old and new producer URLs and location catalogs", () => {
    revalidatePublicProducerProfile("new-handle", "old-handle");
    expect(revalidatePath).toHaveBeenCalledWith("/producer/new-handle");
    expect(revalidatePath).toHaveBeenCalledWith("/producer/old-handle");
    expect(revalidatePath).toHaveBeenCalledWith("/sitemaps/producers.xml");
    expect(revalidatePath).toHaveBeenCalledWith("/producers/in/[location]", "page");
  });
});
