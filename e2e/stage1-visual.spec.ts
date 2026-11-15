import { MongoClient, ObjectId } from "mongodb";
import { expect, test } from "./fixtures";

const testUri = process.env.MONGODB_TEST_URI;
if (!testUri) {
  throw new Error("Stage 1 visual tests require the isolated test database.");
}

const trackId = new ObjectId();
const producerUserId = `stage1-fixture-${new ObjectId().toString()}`;
const producerUsername = `stage1-fixture-${new ObjectId().toString().slice(-10)}`;
const trackSlug = `stage1-fixture-${new ObjectId().toString().slice(-10)}`;
let client: MongoClient;

test.beforeAll(async () => {
  client = new MongoClient(testUri);
  await client.connect();
  const database = client.db();
  const now = new Date();
  await Promise.all([
    database.collection("producerprofiles").insertOne({
      userId: producerUserId,
      slug: producerUsername,
      displayName: "Stage One Test Producer",
      bio: "A fixture profile used only in automated browser tests.",
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
      producerName: "Stage One Test Producer",
      title: "Stage One Fixture Track",
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
      waveform: Array.from({ length: 500 }, (_, index) => 0.2 + (index % 5) * 0.1),
      playCount: 0,
      featured: true,
      files: [
        {
          kind: "preview",
          r2Key: "test-only/stage1-preview.mp3",
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
          termsText: "Fixture terms for automated visual testing.",
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

test.describe("Stage 1 visual behavior", () => {
  test("animates the equalizer only for the selected playing track", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, "paused", {
        configurable: true,
        get() {
          return this.dataset.mockPaused !== "false";
        },
      });
      HTMLMediaElement.prototype.play = function () {
        this.dataset.mockPaused = "false";
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        this.dataset.mockPaused = "true";
      };
      HTMLMediaElement.prototype.load = function () {};
    });

    await page.goto(`/track/${trackId.toString()}/${trackSlug}`);
    const equalizers = page.locator(`[data-equalizer-track="${trackId.toString()}"]`);
    await expect(equalizers).toHaveCount(0);

    await page.getByRole("button", { name: "Play audio preview" }).click();
    await expect(equalizers).toHaveCount(2);
    await expect(equalizers.first()).toHaveAttribute("data-playing", "true");

    await page.getByRole("button", { name: "Pause audio preview" }).click();
    await expect(equalizers).toHaveCount(2);
    await expect(equalizers.first()).toHaveAttribute("data-playing", "false");
  });

  test("keeps hero and equalizer motion off with reduced motion enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const heroWaveform = page.getByTestId("hero-waveform");
    await expect(heroWaveform).toHaveAttribute("data-running", "false");
    await expect
      .poll(() =>
        heroWaveform.locator(".hero-waveform-bar").first().evaluate((element) =>
          getComputedStyle(element).animationName
        )
      )
      .toBe("none");

    await page.addInitScript(() => {
      Object.defineProperty(HTMLMediaElement.prototype, "paused", {
        configurable: true,
        get() {
          return this.dataset.mockPaused !== "false";
        },
      });
      HTMLMediaElement.prototype.play = function () {
        this.dataset.mockPaused = "false";
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        this.dataset.mockPaused = "true";
      };
      HTMLMediaElement.prototype.load = function () {};
    });
    await page.goto(`/track/${trackId.toString()}/${trackSlug}`);
    await page.getByRole("button", { name: "Play audio preview" }).click();
    const equalizerBar = page
      .locator(`[data-equalizer-track="${trackId.toString()}"] span`)
      .first();
    await expect
      .poll(() => equalizerBar.evaluate((element) => getComputedStyle(element).animationName))
      .toBe("none");
    await expect
      .poll(() =>
        equalizerBar.evaluate(
          (element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).d
        )
      )
      .toBeCloseTo(0.28);
  });

  test("has no horizontal overflow on the requested viewport widths", async ({ page }) => {
    for (const width of [360, 390, 768, 1280, 1536]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "/",
        "/tracks",
        `/track/${trackId.toString()}/${trackSlug}`,
      ]) {
        const response = await page.goto(route);
        expect(response?.ok(), `${route} should load at ${width}px`).toBeTruthy();
        const hasOverflow = await page.evaluate(
          () =>
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth
            ) > document.documentElement.clientWidth
        );
        expect(hasOverflow, `${route} should not overflow at ${width}px`).toBe(false);
      }
    }
  });

  test("loads public pages without browser console or page errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const route of [
      "/",
      "/tracks",
      `/track/${trackId.toString()}/${trackSlug}`,
    ]) {
      const response = await page.goto(route);
      expect(response?.ok(), `${route} should load`).toBeTruthy();
    }

    expect(errors).toEqual([]);
  });
});
