import { randomUUID, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { MongoClient, ObjectId } from "mongodb";
import { createEmailVerificationToken } from "better-auth/api";
import { expect, test } from "./fixtures";
import type { Page, Browser, APIRequestContext } from "@playwright/test";

async function signUpAndVerify(
  request: APIRequestContext,
  email: string,
  password: string,
  role: "buyer" | "producer",
  baseUrl: string
): Promise<string> {
  const registration = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: baseUrl },
    data: {
      name: role === "producer" ? "Journey Producer" : "Journey Buyer",
      email,
      password,
      role,
      callbackURL: "/dashboard",
    },
  });
  expect(registration.status()).toBe(200);
  const body = await registration.json();
  expect(body.user).toMatchObject({ email, role, emailVerified: false });
  const token = await createEmailVerificationToken(
    process.env.BETTER_AUTH_SECRET!,
    email,
    undefined,
    86_400,
    { userId: body.user.id }
  );
  const verification = await request.get(
    `/api/auth/verify-email?${new URLSearchParams({
      token,
      callbackURL: `${baseUrl}/dashboard`,
    })}`,
    { headers: { Origin: baseUrl }, maxRedirects: 0 }
  );
  expect(verification.status()).toBe(302);
  return body.user.id as string;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign In" }).last().click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function deleteJourneyData(
  client: MongoClient,
  producerId: string,
  buyerId: string,
  producerEmail: string,
  buyerEmail: string,
  trackId: ObjectId | undefined
): Promise<void> {
  const db = client.db();
  const orders = await db.collection("orders").find({ buyerId }).project({ _id: 1 }).toArray();
  const orderIds = orders.map((order) => order._id);
  const orderStrings = orderIds.map((id) => id.toString());
  await Promise.all([
    db.collection("account").deleteMany({ userId: { $in: [producerId, buyerId] } }),
    db.collection("session").deleteMany({ userId: { $in: [producerId, buyerId] } }),
    db.collection("verification").deleteMany({
      identifier: { $in: [producerEmail, buyerEmail] },
    }),
    db.collection<{ _id: string }>("user").deleteMany({
      _id: { $in: [producerId, buyerId] },
    }),
    db.collection("producerprofiles").deleteMany({ userId: producerId }),
    ...(trackId ? [
      db.collection("tracks").deleteOne({ _id: trackId }),
      db.collection("jobs").deleteMany({ "payload.trackId": trackId.toString() }),
    ] : []),
    db.collection("downloadrecords").deleteMany({ orderId: { $in: orderIds } }),
    db.collection("downloadtokens").deleteMany({ orderId: { $in: orderIds } }),
    db.collection("earningsledgers").deleteMany({ orderId: { $in: orderStrings } }),
    db.collection("payouttransfers").deleteMany({ orderId: { $in: orderStrings } }),
    db.collection("paymentevents").deleteMany({ orderId: { $in: orderStrings } }),
    db.collection("auditlogs").deleteMany({
      $or: [{ targetId: { $in: orderStrings } }, ...(trackId ? [{ targetId: trackId.toString() }] : [])],
    }),
    db.collection("orders").deleteMany({ buyerId }),
  ]);
}

async function approveWithAdmin(
  browser: Browser,
  secret: string,
  trackId: string
): Promise<void> {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-playwright-test-role": "admin",
      "x-playwright-test-secret": secret,
    },
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const stepUp = await page.evaluate(async ({ password, targetId }) => {
      const response = await fetch("/api/admin/step-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, action: "track_moderate", targetId }),
      });
      return { status: response.status, body: await response.json() };
    }, { password: secret, targetId: trackId });
    expect(stepUp.status).toBe(200);
    const moderation = await page.evaluate(async (id) => {
      const response = await fetch(`/api/admin/tracks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "live", reason: "Automated journey approval" }),
      });
      return { status: response.status, body: await response.json() };
    }, trackId);
    expect(moderation.status).toBe(200);
  } finally {
    await context.close();
  }
}

test("producer signup through buyer purchase and admin refund revokes the old download link", async ({
  browser,
  page,
  request,
}, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    testInfo.project.name !== "Desktop Chrome",
    "The database-backed full lifecycle runs once in Desktop Chrome."
  );

  const uri = process.env.MONGODB_TEST_URI;
  const authSecret = process.env.PLAYWRIGHT_TEST_AUTH_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3456";
  if (!uri || !authSecret || !webhookSecret || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("The isolated test database and test auth/payment secrets are required.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const tempDir = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(`${process.env.TMPDIR || "/tmp"}/astrylix-journey-`)
  );
  const audioPath = `${tempDir}/journey.mp3`;
  const producerEmail = `journey-producer-${randomUUID()}@example.test`;
  const buyerEmail = `journey-buyer-${randomUUID()}@example.test`;
  const producerPassword = "Journey-producer-password-2026";
  const buyerPassword = "Journey-buyer-password-2026";
  let producerId = "";
  let buyerId = "";
  let trackId: ObjectId | undefined;
  let buyerContext: Awaited<ReturnType<Browser["newContext"]>> | undefined;
  const uploadedObjects = new Map<string, Buffer>();
  const trackTitle = "Journey Test Beat";
  const trackSlug = `journey-test-${randomUUID()}`;
  let orderResponse: Record<string, unknown> | undefined;

  try {
    producerId = await signUpAndVerify(
      request,
      producerEmail,
      producerPassword,
      "producer",
      baseUrl
    );
    await signIn(page, producerEmail, producerPassword);
    await page.goto("/dashboard/profile");
    const profileResult = await page.evaluate(async (slug) => {
      const response = await fetch("/api/producer/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          displayName: "Journey Producer",
          bio: "Producer profile created in the full lifecycle test.",
          location: { country: "India", state: "Maharashtra", city: "Mumbai" },
        }),
      });
      return { status: response.status, body: await response.json() };
    }, `journey-${randomUUID().slice(0, 8)}`);
    expect(profileResult.status, JSON.stringify(profileResult.body)).toBe(200);

    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=44100:duration=2",
      "-write_id3v2",
      "1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      audioPath,
    ]);

    const db = client.db();
    trackId = new ObjectId();
    await db.collection("tracks").insertOne({
      _id: trackId,
      producerId,
      producerName: "Journey Producer",
      title: trackTitle,
      slug: trackSlug,
      genre: "Hip Hop",
      language: "Instrumental",
      bpm: 100,
      key: "C Minor",
      moods: ["focused"],
      tags: ["journey-test"],
      status: "draft",
      processingStatus: "ready",
      waveform: [],
      playCount: 0,
      featured: false,
      files: [],
      licenses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await page.route("**/api/tracks/upload-url", (route) =>
      route.fulfill({
        json: {
          trackId: trackId!.toString(),
          uploadUrls: {
            mp3: {
              mode: "single",
              uploadUrl: "/journey-storage/upload",
              key: `originals/${trackId}.mp3`,
            },
          },
        },
      })
    );
    await page.route("**/journey-storage/upload", async (route) => {
      const bytes = route.request().postDataBuffer();
      if (!bytes) throw new Error("The generated MP3 was not sent to test storage.");
      uploadedObjects.set(`originals/${trackId}.mp3`, bytes);
      await route.fulfill({ status: 200 });
    });
    await page.route(`**/api/tracks/${trackId}/confirm`, async (route) => {
      const body = route.request().postDataJSON() as {
        title: string;
        genre: string;
        bpm: number;
        key: string;
        moods: string[];
        tags: string[];
        rightsConfirmed: boolean;
        files: Array<{ kind: "mp3"; key: string; size: number; contentType: string }>;
        licenses: unknown[];
      };
      const file = body.files[0];
      const source = uploadedObjects.get(file.key);
      if (!source || source.length !== file.size || !body.rightsConfirmed) {
        await route.fulfill({ status: 400, json: { error: "Test upload confirmation failed." } });
        return;
      }
      await db.collection("tracks").updateOne(
        { _id: trackId, producerId },
        {
          $set: {
            title: body.title,
            genre: body.genre,
            bpm: body.bpm,
            key: body.key,
            moods: body.moods,
            tags: body.tags,
            files: [{
              kind: "mp3",
              r2Key: file.key,
              size: source.length,
              checksum: (await import("node:crypto")).createHash("sha256").update(source).digest("hex"),
              mimeType: "audio/mpeg",
            }],
            licenses: body.licenses,
            rightsConfirmedAt: new Date(),
            status: "pending",
            processingStatus: "queued",
          },
        }
      );
      await db.collection("jobs").insertOne({
        type: "process-track",
        payload: { trackId: trackId!.toString() },
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        runAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await route.fulfill({
        json: { success: true, trackId: trackId!.toString(), status: "pending", processingStatus: "queued" },
      });
    });

    await page.goto("/dashboard/beats/new");
    await page.getByPlaceholder("e.g. Bombay Nights").fill(trackTitle);
    await page.getByRole("button", { name: "Continue to Audio Files" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(audioPath);
    await page.getByRole("button", { name: "Continue to Licenses" }).click();
    await page.getByRole("checkbox", { name: /Rights Confirmation/ }).check();
    await page.getByRole("spinbutton", { name: "Non-Exclusive License" }).fill("100");
    await page.getByLabel("Non-exclusive license terms").fill("Test terms for the automated flow.");
    await page.getByRole("spinbutton", { name: "Exclusive License", exact: true }).fill("1000");
    await page.getByLabel("Exclusive license terms", { exact: true }).fill("Test exclusive terms.");
    await page.getByRole("button", { name: "Continue to Review" }).click();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page).toHaveURL(/\/dashboard\/beats/);

    const { processTrackJob } = await import("../worker/track-processor");
    await processTrackJob(trackId.toString(), {
      async readPrivateObject(key) {
        const audio = uploadedObjects.get(key);
        if (!audio) throw new Error(`Missing generated audio for ${key}.`);
        return audio;
      },
      async writePublicPreview(buffer) {
        const key = `previews/${trackId}.mp3`;
        uploadedObjects.set(key, buffer);
        return key;
      },
      async deletePrivateObject(key) {
        uploadedObjects.delete(key);
      },
    });
    const processed = await db.collection("tracks").findOne({ _id: trackId });
    expect(processed?.processingStatus).toBe("ready");
    expect(processed?.waveform).toHaveLength(500);
    expect(processed?.files).toContainEqual(
      expect.objectContaining({ kind: "preview", r2Key: `previews/${trackId}.mp3` })
    );

    await approveWithAdmin(browser, authSecret, trackId.toString());

    buyerId = await signUpAndVerify(request, buyerEmail, buyerPassword, "buyer", baseUrl);
    buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    await signIn(buyerPage, buyerEmail, buyerPassword);
    await buyerPage.goto(`/tracks?q=${encodeURIComponent(trackTitle)}`);
    const listedBeat = buyerPage.getByRole("link", { name: trackTitle, exact: true });
    await expect(listedBeat).toBeVisible();
    await listedBeat.click();
    await expect(buyerPage.getByRole("heading", { name: trackTitle })).toBeVisible();
    await buyerPage.getByRole("button", { name: /Add to Cart/ }).first().click();
    await buyerPage.addInitScript(() => {
      const testWindow = window as Window & {
        Razorpay: (options: Record<string, unknown>) => {
          on: () => void;
          open: () => void;
        };
        __journeyCheckout?: Record<string, unknown>;
      };
      testWindow.Razorpay = (options: Record<string, unknown>) => {
        testWindow.__journeyCheckout = options;
        return { on: () => undefined, open: () => undefined };
      };
    });
    await buyerPage.route("https://checkout.razorpay.com/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" })
    );
    await buyerPage.route("**/api/orders", async (route) => {
      const response = await route.fetch();
      orderResponse = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        status: response.status(),
        contentType: "application/json",
        body: JSON.stringify(orderResponse),
      });
    });
    await buyerPage.goto("/checkout");
    await expect(buyerPage.getByRole("heading", { name: "Order Checkout" })).toBeVisible();
    await buyerPage.getByRole("button", { name: /^Pay / }).click();
    await expect.poll(() => orderResponse).toBeDefined();
    expect(orderResponse).toMatchObject({ isFree: false, currency: "INR" });
    const orderId = String(orderResponse!.orderId);
    const providerOrderId = String(orderResponse!.providerOrderId);
    const amount = Number(orderResponse!.amountMinorUnits);

    const paymentId = `pay_test_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const webhookBody = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: providerOrderId,
            amount,
            currency: "INR",
            status: "captured",
            captured: true,
            notes: { internal_order_id: orderId },
          },
        },
        order: {
          entity: {
            id: providerOrderId,
            amount,
            currency: "INR",
            notes: { internal_order_id: orderId },
          },
        },
      },
    });
    const signature = createHmac("sha256", webhookSecret).update(webhookBody).digest("hex");
    const webhook = await request.post("/api/webhooks/razorpay", {
      headers: {
        "x-razorpay-signature": signature,
        "x-razorpay-event-id": `journey-${randomUUID()}`,
      },
      data: webhookBody,
    });
    expect(webhook.status()).toBe(200);
    await expect.poll(async () =>
      (await db.collection("orders").findOne({ _id: new ObjectId(orderId) }))?.status
    ).toBe("paid");

    const issued = await buyerPage.evaluate(async ({ id }) => {
      const response = await fetch(`/api/orders/${id}/items/0/download`, {
        headers: { accept: "application/json" },
      });
      return { status: response.status, body: await response.json() };
    }, { id: orderId });
    expect(issued.status).toBe(200);
    const oldDownloadLink = String(issued.body.downloadUrl);
    expect(oldDownloadLink).toMatch(/^\/api\/downloads\/[a-f\d]{48}$/i);
    const beforeRefundDownload = await buyerContext.request.get(oldDownloadLink, {
      maxRedirects: 0,
    });
    expect(beforeRefundDownload.status()).toBe(302);

    const adminContext = await browser.newContext({
      extraHTTPHeaders: {
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": authSecret,
      },
    });
    try {
      const adminPage = await adminContext.newPage();
      await adminPage.goto("/");
      const stepUp = await adminPage.evaluate(async ({ password, targetId }) => {
        const response = await fetch("/api/admin/step-up", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password, action: "order_refund", targetId }),
        });
        return { status: response.status, body: await response.json() };
      }, { password: authSecret, targetId: orderId });
      expect(stepUp.status).toBe(200);
      const refund = await adminPage.evaluate(async ({ orderId: id }) => {
        const response = await fetch(`/api/admin/orders/${id}/refund`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Automated full journey refund" }),
        });
        return { status: response.status, body: await response.json() };
      }, { orderId });
      expect(refund.status).toBe(200);
    } finally {
      await adminContext.close();
    }

    const revokedDownload = await buyerContext.request.get(oldDownloadLink, {
      maxRedirects: 0,
    });
    expect(revokedDownload.status()).toBe(403);
    const refunded = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    expect(refunded?.status).toBe("refunded");
    expect(await db.collection("downloadrecords").findOne({
      orderId: new ObjectId(orderId),
      orderItemIdx: 0,
    })).toMatchObject({ revoked: true });
  } finally {
    await buyerContext?.close();
    await deleteJourneyData(client, producerId, buyerId, producerEmail, buyerEmail, trackId);
    await client.close();
    await (await import("node:fs/promises")).rm(tempDir, { recursive: true, force: true });
  }
});
