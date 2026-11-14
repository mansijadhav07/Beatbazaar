import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("document SEO baseline", () => {
  it("uses Indian English for the document and Open Graph locale", async () => {
    const layout = await readFile(
      path.resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    expect(layout).toContain('<html lang="en-IN">');
    expect(layout).toContain('locale: "en_IN"');
  });
});
