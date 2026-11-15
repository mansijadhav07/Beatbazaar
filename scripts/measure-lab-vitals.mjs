import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { chromium, devices } from "@playwright/test";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const testUri = process.env.MONGODB_TEST_URI;
if (!testUri || testUri === process.env.MONGODB_URI) {
  throw new Error("Performance checks require a separate MONGODB_TEST_URI.");
}
const databaseName = decodeURIComponent(
  new URL(testUri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:"))
    .pathname.slice(1)
);
if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
  throw new Error("MONGODB_TEST_URI must select a database with test in its name.");
}

const baseUrl = "http://127.0.0.1:3457";
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3457"],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      MONGODB_URI: testUri,
      NEXT_PUBLIC_APP_URL: baseUrl,
      BETTER_AUTH_URL: baseUrl,
      NODE_ENV: "production",
    },
  }
);
const mongo = new MongoClient(testUri);
let browser;

try {
  await mongo.connect();
  const database = mongo.db(databaseName);
  const track = await database.collection("tracks").findOne(
    { status: "live", processingStatus: "ready" },
    { projection: { slug: 1, producerId: 1 } }
  );
  if (!track) throw new Error("No live test track is available for the producer-page lab run.");
  const producer = await database.collection("producerprofiles").findOne(
    { userId: track.producerId },
    { projection: { slug: 1 } }
  );
  if (!producer?.slug) throw new Error("The live test track has no producer profile.");

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(1000);
  }
  if (!ready) throw new Error("Production test server did not become ready.");

  browser = await chromium.launch();
  const paths = [
    "/",
    "/tracks",
    `/track/${track._id.toString()}/${track.slug}`,
    `/producer/${producer.slug}`,
  ];
  const profiles = [
    { device: "iPhone 14", reducedMotion: "reduce" },
    { device: "iPhone SE", reducedMotion: "no-preference" },
  ];
  for (const profile of profiles) {
    const context = await browser.newContext({
      ...devices[profile.device],
      reducedMotion: profile.reducedMotion,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
    });
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0, inp: 0, longTaskCount: 0, longestTaskMs: 0 };
      Object.defineProperty(window, "__labVitals", { value: metrics });
      if (!("PerformanceObserver" in window)) return;
      try {
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            metrics.lcp = entry.startTime;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            if (!entry.hadRecentInput) metrics.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            if (entry.interactionId) metrics.inp = Math.max(metrics.inp, entry.duration);
          }
        }).observe({ type: "event", buffered: true, durationThreshold: 16 });
        new PerformanceObserver((entries) => {
          for (const entry of entries.getEntries()) {
            metrics.longTaskCount += 1;
            metrics.longestTaskMs = Math.max(metrics.longestTaskMs, entry.duration);
          }
        }).observe({ type: "longtask", buffered: true });
      } catch {}
    });

    try {
      for (const path of paths) {
        await page.goto(`${baseUrl}${path}`, { waitUntil: "load", timeout: 60_000 });
        const menuButton = page.getByRole("button", { name: "Toggle menu" });
        await menuButton.click();
        await menuButton.click();
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => window.__labVitals);
        console.log(
          JSON.stringify({
            device: profile.device,
            reducedMotion: profile.reducedMotion,
            path,
            lcpMs: Math.round(metrics.lcp),
            inpApproximationMs: Math.round(metrics.inp),
            cls: Number(metrics.cls.toFixed(4)),
            longTaskCount: metrics.longTaskCount,
            longestTaskMs: Math.round(metrics.longestTaskMs),
          })
        );
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  await mongo.close();
  server.kill("SIGTERM");
}
