/**
 * Test identity mechanism.
 *
 * This module is the SINGLE place that decides whether a request may bypass
 * real session authentication using the Playwright test headers. Callers
 * (middleware, guards, step-up) must go through these helpers and never
 * inspect the headers or env vars directly.
 *
 * Security properties (all enforced here):
 *  1. The mechanism is opt-in. It is only active when PLAYWRIGHT_TEST_AUTH_ENABLED
 *     is exactly "true". The Playwright runner injects it into its test server.
 *  2. The server refuses to start (throws at module load and on every auth
 *     call) if the flag is enabled while NODE_ENV is production. A tunnel or
 *     misconfigured deploy cannot silently enable test identity in production.
 *  3. Secret comparison hashes both bounded values and compares every digest
 *     byte. This module is shared with middleware, so it uses Web Crypto.
 *  4. Any request that does not carry a valid test identity is rejected with
 *     HTTP 404, never with a redirect to /login. A 404 means "nothing here",
 *     so an attacker cannot distinguish "test auth is off" from "test auth is
 *     on but you failed". The Host header is NOT used as a security control;
 *     loopback is not asserted anywhere in this module.
 *  5. Role whitelist: only "buyer" and "producer" may be impersonated by
 *     default. "admin" impersonation requires a separate runner opt-in.
 */

export const TEST_IDENTITY_ENV_ENABLED = "PLAYWRIGHT_TEST_AUTH_ENABLED";
export const TEST_IDENTITY_ENV_SECRET = "PLAYWRIGHT_TEST_AUTH_SECRET";
export const TEST_IDENTITY_ENV_ALLOW_ADMIN = "PLAYWRIGHT_TEST_ALLOW_ADMIN";

export const TEST_IDENTITY_HEADER_ROLE = "x-playwright-test-role";
export const TEST_IDENTITY_HEADER_SECRET = "x-playwright-test-secret";

const MAX_TEST_SECRET_LENGTH = 256;

export function isTestAuthEnabled(): boolean {
  return process.env[TEST_IDENTITY_ENV_ENABLED] === "true";
}

export function getTestSecret(): string | null {
  const value = process.env[TEST_IDENTITY_ENV_SECRET];
  return value && value.length > 0 ? value : null;
}

/** True only when the separate admin opt-in is explicitly set. */
export function testAuthAllowsAdmin(): boolean {
  return process.env[TEST_IDENTITY_ENV_ALLOW_ADMIN] === "true";
}

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

export async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  if (
    typeof a !== "string" ||
    typeof b !== "string" ||
    a.length > MAX_TEST_SECRET_LENGTH ||
    b.length > MAX_TEST_SECRET_LENGTH
  ) {
    return false;
  }

  const [digestA, digestB] = await Promise.all([digest(a), digest(b)]);
  let difference = a.length ^ b.length;
  for (let index = 0; index < digestA.length; index += 1) {
    difference |= digestA[index] ^ digestB[index];
  }
  return difference === 0;
}

export function hasTestIdentityAttempt(headers: Headers): boolean {
  return (
    headers.has(TEST_IDENTITY_HEADER_ROLE) ||
    headers.has(TEST_IDENTITY_HEADER_SECRET)
  );
}

export interface TestIdentityResult {
  ok: true;
  role: "buyer" | "producer" | "admin";
}

/**
 * Verify a request's test identity headers. Returns null for invalid
 * combinations. Callers must respond with HTTP 404 for an attempted identity.
 */
export async function verifyTestIdentity(
  headers: Headers,
  roleHeader: string | null
): Promise<TestIdentityResult | null> {
  if (!isTestAuthEnabled()) return null;

  const expected = getTestSecret();
  if (!expected) return null;

  const provided = headers.get(TEST_IDENTITY_HEADER_SECRET);
  if (!(await constantTimeEquals(provided ?? "", expected))) return null;

  if (
    roleHeader === "buyer" ||
    roleHeader === "producer" ||
    (roleHeader === "admin" && testAuthAllowsAdmin())
  ) {
    return { ok: true, role: roleHeader };
  }
  return null;
}

/**
 * Enforced at module load AND on every auth entry point. If the test auth
 * flag is enabled while NODE_ENV is production, the process must not serve.
 */
export function assertTestAuthEnvironment(): void {
  if (isTestAuthEnabled() && process.env.NODE_ENV === "production") {
    throw new Error(
      "Playwright test identity is enabled in a production environment. " +
        "Remove PLAYWRIGHT_TEST_AUTH_ENABLED from the process environment " +
        "before running or deploying the production build."
    );
  }
}

// Enforce at import time so the very first module load refuses to serve.
assertTestAuthEnvironment();