import { describe, expect, it } from "vitest";
import { getAuthBaseUrl } from "./auth-url";

describe("getAuthBaseUrl", () => {
  it("uses the explicitly configured auth base URL", () => {
    expect(
      getAuthBaseUrl({
        BETTER_AUTH_URL: "https://music.example/",
        NEXT_PUBLIC_APP_URL: "https://other.example",
      })
    ).toBe("https://music.example");
  });

  it("falls back to the configured public application URL", () => {
    expect(
      getAuthBaseUrl({
        BETTER_AUTH_URL: "",
        NEXT_PUBLIC_APP_URL: "https://music.example",
      })
    ).toBe("https://music.example");
  });

  it("rejects invalid schemes and credentialed URLs", () => {
    expect(() => getAuthBaseUrl({ BETTER_AUTH_URL: "javascript:alert(1)" })).toThrow();
    expect(() =>
      getAuthBaseUrl({ BETTER_AUTH_URL: "https://user:secret@music.example" })
    ).toThrow();
  });
});
