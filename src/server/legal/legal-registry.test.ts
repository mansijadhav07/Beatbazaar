import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(process.cwd(), "src");
const registryPath = path.resolve(process.cwd(), "docs/legal-review-registry.md");
const marker = ["LEGAL", "REVIEW", "REQUIRED"].join(" ");

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [entryPath] : [];
    })
  );
  return nested.flat();
}

describe("legal review marker registry", () => {
  it("registers every legal review marker in source and no stale paths", async () => {
    const registry = await readFile(registryPath, "utf8");
    const registered = registry.match(/`src\/[^`]+`/g)?.map((item) =>
      item.slice(1, -1)
    ) ?? [];
    const files = await sourceFiles(sourceRoot);
    const marked = (
      await Promise.all(
        files.map(async (file) =>
          (await readFile(file, "utf8")).includes(marker)
            ? path.relative(process.cwd(), file)
            : null
        )
      )
    )
      .filter((file): file is string => file !== null)
      .sort();

    expect(registered.sort()).toEqual(marked);
  });
});
