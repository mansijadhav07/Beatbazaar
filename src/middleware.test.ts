import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("protected-route test identity", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not bypass authentication for a role header alone", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: { "x-playwright-test-role": "admin" },
    });

    const response = await middleware(request);
    // A failed test-identity attempt is answered with 404, never a redirect.
    expect(response.status).toBe(404);
  });

  it("allows the test identity only with the opt-in secret", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: {
        "x-playwright-test-role": "buyer",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect((await middleware(request)).status).toBe(200);
  });

  it("does not gate test identity on the Host header", async () => {
    // The Host header is NOT a security control: a tunnel can make remote
    // requests look local, so we must not rely on it. A request that carries
    // the valid secret succeeds regardless of hostname.
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("https://astrylix.example/admin", {
      headers: {
        "x-playwright-test-role": "buyer",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect((await middleware(request)).status).toBe(200);
  });

  it("rejects a wrong secret with 404 rather than a redirect", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: {
        "x-playwright-test-role": "buyer",
        "x-playwright-test-secret": "wrong-secret",
      },
    });

    expect((await middleware(request)).status).toBe(404);
  });

  it("rejects a missing secret with 404", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: { "x-playwright-test-role": "buyer" },
    });

    expect((await middleware(request)).status).toBe(404);
  });

  it("does not allow admin impersonation without the separate opt-in", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: {
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect((await middleware(request)).status).toBe(404);
  });

  it("allows admin impersonation only when the separate opt-in is set", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    vi.stubEnv("PLAYWRIGHT_TEST_ALLOW_ADMIN", "true");
    const request = new NextRequest("http://127.0.0.1:3000/admin", {
      headers: {
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      },
    });

    expect((await middleware(request)).status).toBe(200);
  });

  it("preserves the protected path and query in the login return parameter", async () => {
    const request = new NextRequest(
      "http://127.0.0.1:3000/dashboard/orders?sort=newest&page=2"
    );

    const response = await middleware(request);
    const destination = new URL(response.headers.get("location") || "");
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("redirect")).toBe(
      "/dashboard/orders?sort=newest&page=2"
    );
  });

  it("preserves an admin return path for sign-in", async () => {
    const request = new NextRequest("https://app.example/admin/reports?status=open");
    const response = await middleware(request);
    const destination = new URL(response.headers.get("location") || "");
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("redirect")).toBe(
      "/admin/reports?status=open"
    );
  });

  it.each(["/checkout", "/orders/123"])(
    "redirects unauthenticated visits to %s through sign-in",
    async (path) => {
      const request = new NextRequest(`https://app.example${path}`);
      const response = await middleware(request);
      const destination = new URL(response.headers.get("location") || "");
      expect(destination.pathname).toBe("/login");
      expect(destination.searchParams.get("redirect")).toBe(path);
    }
  );
});