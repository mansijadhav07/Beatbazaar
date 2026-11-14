import { describe, expect, it } from "vitest";
import { getPublicAssetUrl } from "./public-asset-url";

describe("getPublicAssetUrl", () => {
  it("serves committed local demo files from the app public directory", () => {
    expect(getPublicAssetUrl("local-demo/local-demo-01.mp3")).toBe(
      "/demo/local-demo-01.mp3"
    );
  });

  it("uses the configured CDN for storage keys", () => {
    expect(getPublicAssetUrl("/covers/cover.png")).toMatch(/\/covers\/cover\.png$/);
  });
});
