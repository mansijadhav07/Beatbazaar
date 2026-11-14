import { describe, expect, it } from "vitest";
import { resolvePlaywrightBaseUrl } from "../../scripts/playwright-env.mjs";

describe("resolvePlaywrightBaseUrl", () => {
  it("uses the actual test server origin rather than the app's local default", () => {
    expect(resolvePlaywrightBaseUrl("http://127.0.0.1:3456/")).toBe(
      "http://127.0.0.1:3456"
    );
  });

  it("rejects non-HTTP URLs and credentials", () => {
    expect(() => resolvePlaywrightBaseUrl("javascript:alert(1)")).toThrow();
    expect(() =>
      resolvePlaywrightBaseUrl("https://user:password@example.test")
    ).toThrow();
  });
});
