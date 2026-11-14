import { randomUUID } from "node:crypto";
import { createEmailVerificationToken } from "better-auth/api";
import { MongoClient } from "mongodb";
import { expect, test } from "./fixtures";

async function removeTestAccount(email: string): Promise<void> {
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    throw new Error("MONGODB_TEST_URI is required to clean up auth test accounts.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    const user = await db.collection("user").findOne(
      { email },
      { projection: { _id: 1 } }
    );
    if (!user) return;

    const userIds = [user._id, user._id.toString()];
    await Promise.all([
      db.collection("account").deleteMany({ userId: { $in: userIds } }),
      db.collection("session").deleteMany({ userId: { $in: userIds } }),
      db.collection("verification").deleteMany({ identifier: email }),
      db.collection("user").deleteOne({ _id: user._id }),
    ]);
  } finally {
    await client.close();
  }
}

test("new accounts can resend verification and remain blocked from sign-in until verified", async ({
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "Desktop Chrome",
    "The database-backed auth integration runs once to avoid duplicate account writes across browser profiles."
  );

  const email = `auth-flow-${randomUUID()}@example.test`;
  const password = "Local-auth-test-password-2026";
  const secret = process.env.BETTER_AUTH_SECRET;
  const testUri = process.env.MONGODB_TEST_URI;
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3456";
  if (!secret || !testUri) {
    throw new Error(
      "BETTER_AUTH_SECRET and MONGODB_TEST_URI are required for the auth integration test."
    );
  }

  try {
    const registration = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: baseURL },
      data: {
        name: "Auth Flow Producer",
        email,
        password,
        role: "producer",
        callbackURL: "/dashboard",
      },
    });
    expect(registration.status()).toBe(200);
    const registrationBody = await registration.json();
    expect(registrationBody).toMatchObject({
      user: { email, emailVerified: false, role: "producer" },
    });

    const resend = await request.post("/api/auth/send-verification-email", {
      headers: { Origin: baseURL },
      data: { email, callbackURL: "/dashboard" },
    });
    expect(resend.status()).toBe(200);
    await expect(resend.json()).resolves.toMatchObject({ status: true });

    const signIn = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: baseURL },
      data: { email, password },
    });
    expect(signIn.status()).toBe(403);
    await expect(signIn.json()).resolves.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });

    const verificationToken = await createEmailVerificationToken(
      secret,
      email,
      undefined,
      86_400,
      { userId: registrationBody.user.id }
    );
    const verification = await request.get(
      `/api/auth/verify-email?${new URLSearchParams({
        token: verificationToken,
        callbackURL: `${baseURL}/dashboard`,
      })}`,
      { headers: { Origin: baseURL }, maxRedirects: 0 }
    );
    expect(verification.status()).toBe(302);
    expect(verification.headers().location).toBe(`${baseURL}/dashboard`);

    const inspectionClient = new MongoClient(testUri);
    await inspectionClient.connect();
    let emailVerified: boolean | undefined;
    try {
      const verifiedUser = await inspectionClient
        .db()
        .collection("user")
        .findOne({ email }, { projection: { emailVerified: 1 } });
      emailVerified = verifiedUser?.emailVerified;
    } finally {
      await inspectionClient.close();
    }
    expect(emailVerified).toBe(true);

    const verifiedSignIn = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: baseURL },
      data: { email, password },
    });
    const verifiedSignInBody = await verifiedSignIn.json();
    expect(verifiedSignIn.status(), String(verifiedSignInBody.code)).toBe(200);
    expect(verifiedSignInBody).toMatchObject({
      user: { email, emailVerified: true },
    });
  } finally {
    await removeTestAccount(email);
  }
});

test("an unverified sign-in offers a resend action", async ({ page }) => {
  let resendPayload: unknown;
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        code: "EMAIL_NOT_VERIFIED",
        message: "Email not verified",
      }),
    })
  );
  await page.route("**/api/auth/send-verification-email", async (route) => {
    resendPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true }),
    });
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill("artist@example.test");
  await page.locator('input[type="password"]').fill("Local-auth-test-password-2026");
  await page.getByRole("button", { name: "Sign In" }).last().click();

  await expect(page.getByText(/Verify your email address before signing in/)).toBeVisible();
  await page.getByRole("button", { name: "Resend verification email" }).click();
  await expect(
    page.getByText(/If an unverified account exists for this address/)
  ).toBeVisible();
  expect(resendPayload).toEqual({
    email: "artist@example.test",
    callbackURL: "/dashboard",
  });
});

test("successful registration offers a resend action", async ({ page }) => {
  let resendPayload: unknown;
  await page.route("**/api/auth/sign-up/email", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        token: null,
        user: {
          id: "local-signup-test",
          email: "new-producer@example.test",
          name: "New Producer",
          role: "producer",
          emailVerified: false,
        },
      }),
    })
  );
  await page.route("**/api/auth/send-verification-email", async (route) => {
    resendPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true }),
    });
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Register" }).click();
  await page.locator('input[type="text"]').fill("New Producer");
  await page.locator('input[type="email"]').fill("new-producer@example.test");
  await page.locator('input[type="password"]').fill("Local-auth-test-password-2026");
  await page.getByRole("button", { name: "Sell My Beats" }).click();
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(
    page.getByText(/Your account was created. Verify your email before signing in/)
  ).toBeVisible();
  await page.getByRole("button", { name: "Resend verification email" }).click();
  await expect(
    page.getByText(/If an unverified account exists for this address/)
  ).toBeVisible();
  expect(resendPayload).toEqual({
    email: "new-producer@example.test",
    callbackURL: "/dashboard",
  });
});

test("the verification page can resend a link", async ({ page }) => {
  let resendPayload: unknown;
  await page.route("**/api/auth/send-verification-email", async (route) => {
    resendPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: true }),
    });
  });

  await page.goto("/verify-email?error=TOKEN_EXPIRED");
  await page.waitForLoadState("networkidle");
  await page.locator("#verification-email").fill("artist@example.test");
  await page.getByRole("button", { name: "Resend verification email" }).click();

  await expect(
    page.getByText(/If an unverified account exists for this address/)
  ).toBeVisible();
  expect(resendPayload).toEqual({
    email: "artist@example.test",
    callbackURL: "/dashboard",
  });
});

test("an unlinked Google account returns to a clear verification recovery message", async ({
  page,
}) => {
  await page.goto("/login?error=account_not_linked");
  await expect(
    page.getByRole("alert").getByText(/This email already has an account/)
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request a verification link" })
  ).toHaveAttribute("href", "/verify-email");
});

test("verification resend explains Resend testing-mode recipient restrictions", async ({
  page,
}) => {
  await page.route("**/api/auth/send-verification-email", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Internal Server Error" }),
    })
  );
  await page.goto("/verify-email");
  await page.locator("#verification-email").fill("artist@example.test");
  await page.getByRole("button", { name: "Resend verification email" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Resend testing mode only allows the account owner's address"
  );
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Verify a sending domain in Resend"
  );
});
