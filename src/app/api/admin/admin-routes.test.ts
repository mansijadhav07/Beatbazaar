import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireRole = vi.fn();
const getCurrentUser = vi.fn();
const getAuthInstance = vi.fn();
const checkRateLimit = vi.fn();
const issueAdminStepUpToken = vi.fn();
const stepUpCookieOptions = vi.fn();
const isPlaywrightTestRequest = vi.fn();
const findCredentialAccount = vi.fn();
const verifyPassword = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));
vi.mock("@/server/auth/auth", () => ({
  getAuthInstance: (...args: unknown[]) => getAuthInstance(...args),
}));
vi.mock("@/server/auth/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));
vi.mock("@/server/admin/step-up", () => ({
  ADMIN_STEP_UP_COOKIE: "bb_admin_step_up",
  consumeAdminStepUpToken: vi.fn(),
  isSameOriginRequest: (request: NextRequest) =>
    request.headers.get("origin") === request.nextUrl.origin,
  isPlaywrightTestRequest: (...args: unknown[]) => isPlaywrightTestRequest(...args),
  issueAdminStepUpToken: (...args: unknown[]) => issueAdminStepUpToken(...args),
  stepUpCookieOptions: (...args: unknown[]) => stepUpCookieOptions(...args),
}));
vi.mock("@/server/db/mongoose", () => ({
  connectMongoose: vi.fn().mockResolvedValue(undefined),
}));

import { POST as stepUpPost } from "@/app/api/admin/step-up/route";
import { PATCH as moderateTrack } from "@/app/api/admin/tracks/[id]/route";
import { PATCH as featureTrack } from "@/app/api/admin/tracks/[id]/featured/route";
import { PATCH as updateReport } from "@/app/api/admin/reports/[id]/route";
import { POST as refundOrder } from "@/app/api/admin/orders/[id]/refund/route";
import { GET as exportAdminData } from "@/app/api/admin/export/route";
import { POST as submitReport } from "@/app/api/reports/route";

function request(path: string, method: string, body?: unknown, origin = "http://localhost:3000") {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: {
      origin,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("admin endpoint validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
      session: { id: "session-1", userId: "admin-1" },
    });
    getCurrentUser.mockResolvedValue(null);
    checkRateLimit.mockResolvedValue({ success: true });
    findCredentialAccount.mockResolvedValue({ password: "stored-password-hash" });
    verifyPassword.mockResolvedValue(true);
    getAuthInstance.mockResolvedValue({
      $context: Promise.resolve({
        internalAdapter: { findCredentialAccount },
        password: { verify: verifyPassword },
      }),
    });
    issueAdminStepUpToken.mockResolvedValue(new Date(Date.now() + 300_000));
    stepUpCookieOptions.mockReturnValue({
      httpOnly: true,
      sameSite: "strict",
      path: "/api/admin",
      maxAge: 300,
    });
    isPlaywrightTestRequest.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a step-up request with a foreign origin before checking credentials", async () => {
    const response = await stepUpPost(
      request("/api/admin/step-up", "POST", { password: "p", action: "order_refund", targetId: "1" }, "https://attacker.test")
    );
    expect(response.status).toBe(403);
    expect(requireRole).not.toHaveBeenCalled();
  });

  it("issues a scoped token after password verification without storing submitted identity fields", async () => {
    const response = await stepUpPost(
      request("/api/admin/step-up", "POST", {
        password: "admin-password",
        action: "track_moderate",
        targetId: "track-1",
        pan: "ABCDE1234F",
        aadhaar: "123412341234",
        bankAccount: "123456789012",
        ifsc: "ABCD0123456",
      })
    );
    expect(response.status).toBe(200);
    expect(verifyPassword).toHaveBeenCalledWith({
      hash: "stored-password-hash",
      password: "admin-password",
    });
    const issuedToken = issueAdminStepUpToken.mock.calls[0][0] as Record<string, unknown>;
    expect(issuedToken).toMatchObject({
      action: "track_moderate",
      targetId: "track-1",
    });
    expect(issuedToken).not.toHaveProperty("password");
    expect(issuedToken).not.toHaveProperty("pan");
    expect(issuedToken).not.toHaveProperty("aadhaar");
    expect(issuedToken).not.toHaveProperty("bankAccount");
    expect(issuedToken).not.toHaveProperty("ifsc");
    expect(response.headers.get("set-cookie")).toContain("bb_admin_step_up");
  });

  it("does not issue a step-up token for an account without a password credential", async () => {
    findCredentialAccount.mockResolvedValue(null);
    const response = await stepUpPost(
      request("/api/admin/step-up", "POST", {
        password: "admin-password",
        action: "track_moderate",
        targetId: "track-1",
      })
    );
    expect(response.status).toBe(403);
    expect(issueAdminStepUpToken).not.toHaveBeenCalled();
  });

  it("allows test-mode step-up only with the server opt-in and matching runner secret", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_ALLOW_ADMIN", "true");
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "runner-secret");
    isPlaywrightTestRequest.mockResolvedValue(true);

    const response = await stepUpPost(
      request("/api/admin/step-up", "POST", {
        password: "runner-secret",
        action: "track_moderate",
        targetId: "track-1",
      })
    );

    expect(response.status).toBe(200);
    expect(getAuthInstance).not.toHaveBeenCalled();
    expect(issueAdminStepUpToken).toHaveBeenCalled();
  });

  it("does not treat the runner secret as a password without the admin opt-in", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH_SECRET", "runner-secret");
    isPlaywrightTestRequest.mockResolvedValue(true);
    findCredentialAccount.mockResolvedValue(null);

    const response = await stepUpPost(
      request("/api/admin/step-up", "POST", {
        password: "runner-secret",
        action: "track_moderate",
        targetId: "track-1",
      })
    );

    expect(response.status).toBe(403);
    expect(issueAdminStepUpToken).not.toHaveBeenCalled();
  });

  it("validates the moderation decision before authorization or database access", async () => {
    const response = await moderateTrack(
      request("/api/admin/tracks/507f1f77bcf86cd799439011", "PATCH", { status: "live" }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect(response.status).toBe(400);
    expect(requireRole).not.toHaveBeenCalled();
  });

  it("validates featured state before authorization", async () => {
    const response = await featureTrack(
      request("/api/admin/tracks/507f1f77bcf86cd799439011/featured", "PATCH", { featured: "yes" }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect(response.status).toBe(400);
  });

  it("validates report decisions before authorization", async () => {
    const response = await updateReport(
      request("/api/admin/reports/507f1f77bcf86cd799439011", "PATCH", { status: "closed" }),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect(response.status).toBe(400);
  });

  it("requires a refund reason before authorization", async () => {
    const response = await refundOrder(
      request("/api/admin/orders/507f1f77bcf86cd799439011/refund", "POST", {}),
      { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }
    );
    expect(response.status).toBe(400);
  });

  it("rejects unknown export types after server-side role authorization", async () => {
    const response = await exportAdminData(
      new NextRequest("http://localhost:3000/api/admin/export?type=unknown")
    );
    expect(response.status).toBe(400);
    expect(requireRole).toHaveBeenCalledWith(["admin"]);
  });

  it("requires sign-in to submit a user report", async () => {
    const response = await submitReport(
      request("/api/reports", "POST", {
        trackId: "507f1f77bcf86cd799439011",
        category: "copyright",
        details: "This is a test rights report.",
      })
    );
    expect(response.status).toBe(401);
  });
});
