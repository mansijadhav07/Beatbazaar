import AxeBuilder from "@axe-core/playwright";
import { MongoClient, ObjectId } from "mongodb";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const testUri = process.env.MONGODB_TEST_URI;
if (!testUri) {
  throw new Error("Accessibility fixtures require the isolated test database.");
}

const trackId = new ObjectId();
const producerUserId = `axe-fixture-${new ObjectId().toString()}`;
const producerUsername = `axe-fixture-${new ObjectId().toString().slice(-10)}`;
const trackSlug = `accessibility-fixture-${new ObjectId().toString().slice(-10)}`;
let client: MongoClient;

async function checkAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousOrCritical = results.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || "")
  );
  expect(
    seriousOrCritical,
    seriousOrCritical.map((violation) => `${violation.id}: ${violation.help}`).join("\n")
  ).toEqual([]);
}

test.beforeAll(async () => {
  client = new MongoClient(testUri);
  await client.connect();
  const database = client.db();
  const now = new Date();
  await database.collection("tracks").deleteOne({
    slug: "accessibility-fixture-track",
  });
  await Promise.all([
    database.collection("producerprofiles").insertOne({
      userId: producerUserId,
      slug: producerUsername,
      displayName: "Accessibility Test Producer",
      bio: "Fixture profile used only by automated accessibility tests.",
      avatarKey: null,
      location: { country: "India", state: "Test State", city: "Test City" },
      verified: false,
      kycStatus: "not_started",
      payoutRequiredActions: [],
      followerCount: 0,
      createdAt: now,
      updatedAt: now,
    }),
    database.collection("tracks").insertOne({
      _id: trackId,
      producerId: producerUserId,
      producerName: "Accessibility Test Producer",
      title: "Accessibility Fixture Track",
      slug: trackSlug,
      genre: "Fixture Genre",
      language: "Instrumental",
      bpm: 90,
      key: "C",
      moods: [],
      tags: [],
      coverKey: null,
      status: "live",
      processingStatus: "ready",
      waveform: [0.2, 0.4, 0.2],
      playCount: 0,
      featured: true,
      files: [
        {
          kind: "preview",
          r2Key: "test-only/accessibility-preview.mp3",
          size: 10,
          checksum: "test-only",
          mimeType: "audio/mpeg",
        },
      ],
      licenses: [
        {
          tier: "non_exclusive",
          name: "Test license",
          price: { amount: 1000, currency: "INR" },
          includedFiles: ["mp3"],
          termsText: "Fixture license terms for automated testing.",
          termsVersion: "test",
          enabled: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }),
  ]);
});

test.afterAll(async () => {
  if (!client) return;
  const database = client.db();
  await Promise.all([
    database.collection("producerprofiles").deleteOne({ userId: producerUserId }),
    database.collection("tracks").deleteOne({ _id: trackId }),
  ]);
  await client.close();
});

test.describe("accessibility on Desktop Chrome and iPhone 14", () => {
  test.use({ playwrightTestRole: "buyer" });

  test("checks buyer and public pages with axe", async ({ page, request }, testInfo) => {
    test.skip(
      !["Desktop Chrome", "Mobile Safari (iPhone 14)"].includes(testInfo.project.name),
      "This accessibility run is scoped to Desktop Chrome and iPhone 14."
    );
    const paths = [
      "/",
      "/tracks",
      `/track/${trackId.toString()}/${trackSlug}`,
      `/producer/${producerUsername}`,
      "/cart",
      "/checkout",
      "/login",
    ];
    for (const route of paths) {
      const response = await request.get(route);
      expect(response.ok(), `Expected ${route} to return a successful response`).toBeTruthy();
    }

    for (const route of paths) {
      await test.step(`axe: ${route}`, async () => {
        await page.goto(route);
        if (route === "/") {
          await expect(
            page.getByRole("heading", { name: "Featured beats" })
          ).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "Recently published" })
          ).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "Browse by genre" })
          ).toBeVisible();
        }
        await checkAccessibility(page);
      });
    }
  });

  test.describe("producer dashboard", () => {
    test.use({ playwrightTestRole: "producer" });

    test("checks dashboard with axe", async ({ page }, testInfo) => {
      test.skip(
        !["Desktop Chrome", "Mobile Safari (iPhone 14)"].includes(testInfo.project.name),
        "This accessibility run is scoped to Desktop Chrome and iPhone 14."
      );
      await page.goto("/dashboard");
      await checkAccessibility(page);
    });
  });
});

test.describe("admin accessibility on Desktop Chrome and iPhone 14", () => {
  test.use({ playwrightTestRole: "admin" });

  test("checks admin settings with axe", async ({ page }, testInfo) => {
    test.skip(
      !["Desktop Chrome", "Mobile Safari (iPhone 14)"].includes(testInfo.project.name),
      "This accessibility run is scoped to Desktop Chrome and iPhone 14."
    );
    await page.goto("/admin/settings");
    await checkAccessibility(page);
  });

  test("keeps keyboard focus visible and honors reduced motion", async ({ page }, testInfo) => {
    test.skip(
      !["Desktop Chrome", "Mobile Safari (iPhone 14)"].includes(testInfo.project.name),
      "This accessibility run is scoped to Desktop Chrome and iPhone 14."
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const outlineStyle = await focused.evaluate((element) =>
      getComputedStyle(element).outlineStyle
    );
    expect(outlineStyle).not.toBe("none");
    const transitionDuration = await focused.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration)
    );
    expect(transitionDuration).toBeLessThanOrEqual(0.00001);
  });
});
