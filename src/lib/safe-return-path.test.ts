import { describe, expect, it } from "vitest";
import { getSafeReturnPath } from "./safe-return-path";

describe("getSafeReturnPath", () => {
  it("preserves an internal path and its query string", () => {
    expect(getSafeReturnPath("/dashboard/orders?sort=newest")).toBe(
      "/dashboard/orders?sort=newest"
    );
  });

  it.each([
    "https://attacker.example",
    "//attacker.example/path",
    "javascript:alert(1)",
    "\\\\attacker.example\\path",
  ])("falls back for an external or invalid target: %s", (candidate) => {
    expect(getSafeReturnPath(candidate)).toBe("/dashboard");
  });

  it("uses a caller-provided internal fallback", () => {
    expect(getSafeReturnPath(null, "/")).toBe("/");
  });
});
