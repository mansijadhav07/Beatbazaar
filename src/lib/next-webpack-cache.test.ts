import { describe, expect, it } from "vitest";
import { getDevelopmentWebpackCache } from "./next-webpack-cache";

describe("development webpack cache", () => {
  it("uses memory caching instead of filesystem pack files", () => {
    expect(getDevelopmentWebpackCache()).toEqual({ type: "memory" });
  });
});
