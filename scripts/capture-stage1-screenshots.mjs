import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ path: ".env.local", quiet: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testUri = process.env.MONGODB_TEST_URI;
if (!testUri || testUri === process.env.MONGODB_URI) {
  throw new Error("Stage 1 screenshots require a separate MONGODB_TEST_URI.");
}

const databaseName = decodeURIComponent(
  new URL(testUri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"))
    .pathname.slice(1)
);
if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
  throw new Error("MONGODB_TEST_URI must select a database with test in its name.");
}

const baseUrl = process.env.STAGE1_SCREENSHOT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
if (!baseUrl) throw new Error("Set NEXT_PUBLIC_APP_URL or STAGE1_SCREENSHOT_BASE_URL.");
const parsedBaseUrl = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(parsedBaseUrl.hostname)) {
  throw new Error("Stage 1 screenshots may only be captured from a local app.");
}

const mongo = new MongoClient(testUri);
let browser;
try {
  await mongo.connect();
  const database = mongo.db(databaseName);
  const track = await database.collection("tracks").findOne(
    { status: "live", processingStatus: "ready" },
    { projection: { slug: 1 } }
  );
  if (!track?.slug) {
    throw new Error("No live, processed track exists. Run npm run db:seed first.");
  }

  const appResponse = await fetch(baseUrl);
  if (!appResponse.ok) {
    throw new Error(`The local app returned HTTP ${appResponse.status} at ${baseUrl}.`);
  }

  const screenshotDirectory = path.join(root, "docs/screenshots");
  await fs.mkdir(screenshotDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const routes = [
    ["home", "/"],
    ["tracks", "/tracks"],
    ["track", `/track/${track._id.toString()}/${track.slug}`],
  ];

  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of routes) {
      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      if (!response?.ok()) {
        throw new Error(`${route} returned HTTP ${response?.status() ?? "no response"}.`);
      }
      await page.evaluate(() => document.fonts.ready);
      const screenshotPath = path.join(screenshotDirectory, `${name}-${width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved ${path.relative(root, screenshotPath)}.`);
    }
  }
} finally {
  await browser?.close();
  await mongo.close();
}
