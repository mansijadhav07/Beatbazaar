import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const redirectMock = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  (err as any).digest = `NEXT_REDIRECT;replace;${url};307;;`;
  throw err;
});
const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND");
  (err as any).digest = "NEXT_NOT_FOUND";
  throw err;
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
}));

// Mock next/headers
const headersMock = vi.fn().mockResolvedValue(new Headers());
vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

// Mock auth module
const getSessionMock = vi.fn();
vi.mock("@/server/auth/auth", () => ({
  getAuthInstance: vi.fn().mockResolvedValue({
    api: {
      getSession: () => getSessionMock(),
    },
  }),
}));

import { requireRole, getCurrentUser } from "./guards";

describe("requireRole server guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to /login if there is no active session", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    await expect(requireRole(["producer"])).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /?error=unauthorized if role does not match", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "user_123",
        email: "artist@example.com",
        name: "Artist Name",
        role: "buyer",
        emailVerified: true,
      },
      session: {
        id: "sess_123",
        userId: "user_123",
        token: "tok_123",
        expiresAt: new Date(Date.now() + 600000),
      },
    });

    await expect(requireRole(["admin"])).rejects.toThrow();
    expect(redirectMock).toHaveBeenCalledWith("/?error=unauthorized");
  });

  it("returns user session context when role matches", async () => {
    const mockSession = {
      user: {
        id: "prod_123",
        email: "producer@example.com",
        name: "Producer Pro",
        role: "producer",
        emailVerified: true,
        image: null,
      },
      session: {
        id: "sess_456",
        userId: "prod_123",
        token: "tok_456",
        expiresAt: new Date(Date.now() + 600000),
      },
    };
    getSessionMock.mockResolvedValueOnce(mockSession);

    const result = await requireRole(["producer", "admin"]);
    expect(result.user.id).toBe("prod_123");
    expect(result.user.role).toBe("producer");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an invalid test-identity attempt", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    headersMock.mockResolvedValue(
      new Headers({
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "wrong-secret",
      })
    );

    await expect(requireRole(["admin"])).rejects.toThrow();
    expect(notFoundMock).toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("permits test role bypass with the correct secret and a whitelisted role", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    headersMock.mockResolvedValue(
      new Headers({
        "x-playwright-test-role": "producer",
        "x-playwright-test-secret": "test-secret",
      })
    );

    const result = await requireRole(["producer"]);
    expect(result.user.id).toBe("playwright_test_user");
    expect(result.user.role).toBe("producer");
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("does not permit admin impersonation without the separate opt-in", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    headersMock.mockResolvedValue(
      new Headers({
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      })
    );

    await expect(requireRole(["admin"])).rejects.toThrow();
    expect(notFoundMock).toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("permits admin impersonation only with the separate opt-in", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_ENABLED", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "test-secret");
    vi.stubEnv("PLAYWRIGHT_TEST_ALLOW_ADMIN", "true");
    headersMock.mockResolvedValue(
      new Headers({
        "x-playwright-test-role": "admin",
        "x-playwright-test-secret": "test-secret",
      })
    );

    const result = await requireRole(["admin"]);
    expect(result.user.id).toBe("playwright_test_user");
    expect(result.user.role).toBe("admin");
    expect(getSessionMock).not.toHaveBeenCalled();
  });
});

describe("getCurrentUser helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if no session exists", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("returns the current user without throwing", async () => {
    getSessionMock.mockResolvedValueOnce({
      user: {
        id: "user_999",
        email: "buyer@example.com",
        name: "Beat Fan",
        role: "buyer",
        emailVerified: false,
      },
    });

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe("user_999");
    expect(user?.role).toBe("buyer");
  });
});