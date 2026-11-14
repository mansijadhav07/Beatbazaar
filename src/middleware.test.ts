import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("protected-route test identity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not bypass authentication for a role header alone", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: { "x-playwright-test-role": "admin" },
    });

    const response = middleware(request);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows the test identity only with the opt-in secret on loopback", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: {
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect(middleware(request).headers.get("location")).toBeNull();
  });

  it("does not permit test identity on a non-loopback host", () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("https://beatbazaar.example/admin", {
      headers: {
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect(middleware(request).headers.get("location")).toContain("/login");
  });
});
