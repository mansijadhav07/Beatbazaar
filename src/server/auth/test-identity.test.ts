import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  constantTimeEquals,
  getTestSecret,
  isTestAuthEnabled,
  testAuthAllowsAdmin,
  verifyTestIdentity,
} from "@/server/auth/test-identity";

describe("test identity environment guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws at module load when the test auth flag is enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "any-secret");

    // Re-import the module fresh so the module-level guard re-runs.
    vi.resetModules();
    await expect(import("@/server/auth/test-identity")).rejects.toThrow(
      /Playwright test identity is enabled in a production environment/
    );
  });

  it("does not throw when the flag is enabled in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "any-secret");

    vi.resetModules();
    const mod = await import("@/server/auth/test-identity");
    expect(typeof mod.verifyTestIdentity).toBe("function");
  });

  it("does not throw when the flag is absent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "false");

    vi.resetModules();
    const mod = await import("@/server/auth/test-identity");
    expect(mod.isTestAuthEnabled()).toBe(false);
  });
});

describe("constant time comparison", () => {
  it("returns true for identical strings", async () => {
    expect(await constantTimeEquals("abc", "abc")).toBe(true);
  });

  it("returns false for different strings of equal length", async () => {
    expect(await constantTimeEquals("abc", "abd")).toBe(false);
  });

  it("returns false for different lengths and oversized inputs", async () => {
    expect(await constantTimeEquals("short", "much-longer-secret")).toBe(false);
    expect(await constantTimeEquals("", "secret")).toBe(false);
    expect(await constantTimeEquals("x".repeat(257), "secret")).toBe(false);
  });
});

describe("verifyTestIdentity", () => {
  beforeEach(() => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "the-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the mechanism is disabled", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "false");
    const headers = new Headers({
      "x-playwright-test-role": "buyer",
      "x-playwright-test-secret": "the-secret",
    });
    await expect(verifyTestIdentity(headers, "buyer")).resolves.toBeNull();
  });

  it("returns null when the secret is missing", async () => {
    const headers = new Headers({ "x-playwright-test-role": "buyer" });
    await expect(verifyTestIdentity(headers, "buyer")).resolves.toBeNull();
  });

  it("returns null when the secret is wrong", async () => {
    const headers = new Headers({
      "x-playwright-test-role": "buyer",
      "x-playwright-test-secret": "wrong",
    });
    await expect(verifyTestIdentity(headers, "buyer")).resolves.toBeNull();
  });

  it("returns null when the role is not whitelisted", async () => {
    const headers = new Headers({
      "x-playwright-test-role": "admin",
      "x-playwright-test-secret": "the-secret",
    });
    await expect(verifyTestIdentity(headers, "admin")).resolves.toBeNull();
  });

  it("returns the role when all checks pass", async () => {
    const headers = new Headers({
      "x-playwright-test-role": "producer",
      "x-playwright-test-secret": "the-secret",
    });
    const result = await verifyTestIdentity(headers, "producer");
    expect(result).toEqual({ ok: true, role: "producer" });
  });

  it("allows admin only with the separate opt-in", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_ALLOW_ADMIN", "true");
    const headers = new Headers({
      "x-playwright-test-role": "admin",
      "x-playwright-test-secret": "the-secret",
    });
    await expect(verifyTestIdentity(headers, "admin")).resolves.toEqual({
      ok: true,
      role: "admin",
    });
  });
});

describe("getTestSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the secret is not set", () => {
    delete process.env.PLAYWRIGHT_TEST_AUTH_SECRET;
    expect(getTestSecret()).toBeNull();
  });

  it("returns the configured secret", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "abc");
    expect(getTestSecret()).toBe("abc");
  });
});

describe("isTestAuthEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true only when the flag is exactly 'true'", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    expect(isTestAuthEnabled()).toBe(true);

    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "True");
    expect(isTestAuthEnabled()).toBe(false);
  });
});

describe("testAuthAllowsAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is false by default", () => {
    delete process.env.PLAYWRIGHT_TEST_ALLOW_ADMIN;
    expect(testAuthAllowsAdmin()).toBe(false);
  });

  it("is true only when the opt-in is exactly 'true'", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_ALLOW_ADMIN", "true");
    expect(testAuthAllowsAdmin()).toBe(true);
  });
});