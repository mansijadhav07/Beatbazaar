import { chromium } from "@playwright/test";

async function measureWebVitals(url: string, pageName: string) {
  const browser = await chromium.launch();
  // Mobile profile emulation (iPhone 14 / mobile viewport)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Inject Web Vitals observer before navigation
  await page.addInitScript(() => {
    (window as any).__vitals = { lcp: 0, cls: 0, fid: 0 };

    // LCP
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        (window as any).__vitals.lcp = lastEntry.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          (window as any).__vitals.cls = clsValue;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const start = Date.now();
  await page.goto(url, { waitUntil: "networkidle" });
  const loadDuration = Date.now() - start;

  // Wait extra 1s for layout shifts and paints to settle
  await page.waitForTimeout(1000);

  const vitals = await page.evaluate(() => (window as any).__vitals);

  console.log(`\n--- Mobile Performance Metrics for ${pageName} (${url}) ---`);
  console.log(`LCP (Largest Contentful Paint): ${Math.round(vitals.lcp || loadDuration)} ms`);
  console.log(`CLS (Cumulative Layout Shift): ${vitals.cls.toFixed(4)}`);
  console.log(`Network Idle Load Time: ${loadDuration} ms`);

  await browser.close();
}

async function run() {
  const port = process.env.PORT || 3000;
  await measureWebVitals(`http://localhost:${port}/tracks`, "Browse Catalog Page (/tracks)");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

