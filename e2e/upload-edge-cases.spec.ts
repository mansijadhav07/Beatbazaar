import { expect, test } from "./fixtures";
import { open, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MiB = 1024 * 1024;
const multipartThreshold = 50 * MiB;
const maxMp3Size = 200 * MiB;

async function createSparseMp3(size: number): Promise<{ directory: string; filePath: string }> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "beatbazaar-upload-e2e-"));
  const filePath = path.join(directory, "test-track.mp3");
  await writeFile(filePath, Buffer.from("ID3"));
  const file = await open(filePath, "r+");
  try {
    await file.truncate(size);
  } finally {
    await file.close();
  }
  return { directory, filePath };
}

test.describe("upload validation and multipart browser flow", () => {
  test.use({ playwrightTestRole: "producer" });

  test("uploads multipart parts and confirms every returned ETag", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "Large multipart upload runs once in Desktop Chrome.");
    const sparse = await createSparseMp3(multipartThreshold + 1);
    let confirmation: Record<string, unknown> | undefined;
    const partCount = Math.ceil((multipartThreshold + 1) / (10 * MiB));
    try {
      await page.route("**/api/tracks/upload-url", (route) =>
        route.fulfill({
          json: {
            trackId: "507f1f77bcf86cd799439011",
            uploadUrls: {
              mp3: {
                mode: "multipart",
                uploadId: "multipart-test-id",
                key: "originals/test-track.mp3",
                parts: Array.from({ length: partCount }, (_, index) => ({
                  partNumber: index + 1,
                  url: `/mock-storage/part-${index + 1}`,
                })),
              },
            },
          },
        })
      );
      await page.route("**/mock-storage/part-*", (route) =>
        route.fulfill({
          status: 200,
          headers: { etag: `"part-${route.request().url().split("-").at(-1)}"` },
        })
      );
      await page.route("**/api/tracks/507f1f77bcf86cd799439011/confirm", async (route) => {
        confirmation = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ json: { success: true } });
      });

      await page.goto("/dashboard/beats/new");
      await page.getByPlaceholder("e.g. Bombay Nights").fill("Multipart upload test");
      await page.getByRole("button", { name: "Continue to Audio Files" }).click();
      await page.locator('input[type="file"]').first().setInputFiles(sparse.filePath);
      await page.getByRole("button", { name: "Continue to Licenses" }).click();
      await page.getByRole("checkbox", { name: /Rights Confirmation/ }).check();
      await page.getByRole("spinbutton", { name: "Non-Exclusive License" }).fill("250");
      await page.getByLabel("Non-exclusive license terms").fill("Test non-exclusive terms.");
      await page.getByRole("spinbutton", { name: "Exclusive License", exact: true }).fill("2500");
      await page.getByLabel("Exclusive license terms", { exact: true }).fill("Test exclusive terms.");
      await page.getByRole("button", { name: "Continue to Review" }).click();
      await page.getByRole("button", { name: "Submit for review" }).click();

      await expect.poll(() => confirmation).toBeDefined();
      const files = confirmation?.files as Array<Record<string, unknown>>;
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({
        kind: "mp3",
        mode: "multipart",
        uploadId: "multipart-test-id",
      });
      expect(files[0].parts).toEqual(
        Array.from({ length: partCount }, (_, index) => ({
          PartNumber: index + 1,
          ETag: `"part-${index + 1}"`,
        }))
      );
    } finally {
      await rm(sparse.directory, { recursive: true, force: true });
    }
  });

  test("rejects fake audio bytes in the browser before requesting upload slots", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "Upload validation runs once in Desktop Chrome.");
    let requestedUploadUrl = false;
    await page.route("**/api/tracks/upload-url", (route) => {
      requestedUploadUrl = true;
      return route.fulfill({ json: { trackId: "unused", uploadUrls: {} } });
    });
    await page.goto("/dashboard/beats/new");
    await page.getByPlaceholder("e.g. Bombay Nights").fill("Fake audio test");
    await page.getByRole("button", { name: "Continue to Audio Files" }).click();
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "fake.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("not an audio file"),
    });
    await page.getByRole("button", { name: "Continue to Licenses" }).click();
    await page.getByRole("checkbox", { name: /Rights Confirmation/ }).check();
    await page.getByRole("spinbutton", { name: "Non-Exclusive License" }).fill("250");
    await page.getByLabel("Non-exclusive license terms").fill("Test non-exclusive terms.");
    await page.getByRole("spinbutton", { name: "Exclusive License", exact: true }).fill("2500");
    await page.getByLabel("Exclusive license terms", { exact: true }).fill("Test exclusive terms.");
    await page.getByRole("button", { name: "Continue to Review" }).click();
    await page.getByRole("button", { name: "Submit for review" }).click();

    await expect(page.getByText(/File contents do not match the selected mp3 file type/)).toBeVisible();
    expect(requestedUploadUrl).toBe(false);
  });

  test("rejects an oversized MP3 before requesting upload slots", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop Chrome", "Upload validation runs once in Desktop Chrome.");
    const sparse = await createSparseMp3(maxMp3Size + 1);
    let requestedUploadUrl = false;
    try {
      await page.route("**/api/tracks/upload-url", (route) => {
        requestedUploadUrl = true;
        return route.fulfill({ json: { trackId: "unused", uploadUrls: {} } });
      });
      await page.goto("/dashboard/beats/new");
      await page.getByPlaceholder("e.g. Bombay Nights").fill("Oversized upload test");
      await page.getByRole("button", { name: "Continue to Audio Files" }).click();
      await page.locator('input[type="file"]').first().setInputFiles(sparse.filePath);
      await page.getByRole("button", { name: "Continue to Licenses" }).click();
      await page.getByRole("checkbox", { name: /Rights Confirmation/ }).check();
      await page.getByRole("spinbutton", { name: "Non-Exclusive License" }).fill("250");
      await page.getByLabel("Non-exclusive license terms").fill("Test non-exclusive terms.");
      await page.getByRole("spinbutton", { name: "Exclusive License", exact: true }).fill("2500");
      await page.getByLabel("Exclusive license terms", { exact: true }).fill("Test exclusive terms.");
      await page.getByRole("button", { name: "Continue to Review" }).click();
      await page.getByRole("button", { name: "Submit for review" }).click();

      await expect(page.getByText(/mp3 exceeds the maximum upload size/)).toBeVisible();
      expect(requestedUploadUrl).toBe(false);
    } finally {
      await rm(sparse.directory, { recursive: true, force: true });
    }
  });
});
