import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("transactional email links", () => {
  it("uses configured internal URLs and protects every external-capable anchor", async () => {
    const [authSource, fulfillmentSource] = await Promise.all([
      readFile(new URL("../auth/auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../payments/fulfillment.ts", import.meta.url), "utf8"),
    ]);

    const anchors = `${authSource}\n${fulfillmentSource}`.matchAll(
      /<a\b([^>]*)>/g
    );
    const attributes = [...anchors].map((match) => match[1]);

    expect(attributes).toHaveLength(3);
    for (const attribute of attributes) {
      expect(attribute).toMatch(/\brel="noopener noreferrer"/);
    }

    expect(authSource).toContain("baseURL: getAuthBaseUrl()");
    expect(fulfillmentSource).toContain("getAppUrl(");
    expect(authSource).not.toMatch(/href="https?:\/\/(?:localhost|127\.0\.0\.1)/i);
    expect(fulfillmentSource).not.toMatch(
      /href="https?:\/\/(?:localhost|127\.0\.0\.1)/i
    );
  });
});
