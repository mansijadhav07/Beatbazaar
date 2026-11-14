import { describe, expect, it } from "vitest";
import { readPayoutsEnabled } from "./site";

describe("payouts feature flag", () => {
  it("defaults to disabled and requires an explicit true value", () => {
    expect(readPayoutsEnabled(undefined)).toBe(false);
    expect(readPayoutsEnabled("false")).toBe(false);
    expect(readPayoutsEnabled("true")).toBe(true);
  });
});
