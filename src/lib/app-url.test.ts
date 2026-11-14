import { describe, expect, it } from "vitest";
import { getAppUrl } from "./app-url";

describe("getAppUrl", () => {
  it("builds an absolute application link from the configured base URL", () => {
    expect(getAppUrl("/orders/order-id", "https://music.example/")).toBe(
      "https://music.example/orders/order-id"
    );
  });

  it("rejects external destinations", () => {
    expect(() => getAppUrl("//attacker.example", "https://music.example")).toThrow();
    expect(() => getAppUrl("https://attacker.example", "https://music.example")).toThrow();
  });
});
