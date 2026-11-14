import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { expect, test } from "./fixtures";

test("a visitor can submit a rate-limited beat report with a contact email", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "Desktop Chrome",
    "The database-backed public report flow runs once to avoid duplicate reports."
  );
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri) throw new Error("MONGODB_TEST_URI is required for public report browser coverage.");
  const client = new MongoClient(uri);
  const id = new ObjectId();
  const suffix = randomUUID();
  await client.connect();
  const tracks = client.db().collection("tracks");
  const reports = client.db().collection("reports");

  try {
    await tracks.insertOne({
      _id: id,
      producerId: `report-test-${suffix}`,
      producerName: "Report test producer",
      title: "Report form test beat",
      slug: `report-form-test-${suffix}`,
      genre: "Test",
      language: "Instrumental",
      bpm: 100,
      key: "C",
      moods: [],
      tags: [],
      status: "live",
      processingStatus: "ready",
      waveform: [],
      playCount: 0,
      featured: false,
      files: [{ kind: "preview", r2Key: `preview/${suffix}.mp3`, size: 1, checksum: "test", mimeType: "audio/mpeg" }],
      licenses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await page.goto("/report");
    await expect(page.getByRole("heading", { name: "Report a beat" })).toBeVisible();
    await expect(page.locator("select").first()).toContainText("Report form test beat");
    await page.getByLabel("Contact email").fill("reporter@example.test");
    await page.getByLabel("Reason").selectOption("copyright");
    await page.getByLabel("Details").fill("I own a sample used in this beat.");
    await page.getByRole("button", { name: "Submit report" }).click();
    await expect(page.getByRole("status")).toHaveText("Report submitted for review.");

    const saved = await reports.findOne({ trackId: id });
    expect(saved).toMatchObject({
      trackTitle: "Report form test beat",
      reporterEmail: "reporter@example.test",
      category: "copyright",
      status: "open",
    });
    expect(saved).not.toHaveProperty("reporterId");
    expect(saved).not.toHaveProperty("ip");
    expect(saved).not.toHaveProperty("ipAddress");
  } finally {
    await Promise.all([
      tracks.deleteOne({ _id: id }),
      reports.deleteMany({ trackId: id }),
    ]);
    await client.close();
  }
});
