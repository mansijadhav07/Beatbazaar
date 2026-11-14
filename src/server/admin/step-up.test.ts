import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";

const createTokenRecord = vi.fn();
const findOneAndUpdate = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/mongoose", () => ({
  connectMongoose: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/server/db/models/AdminStepUpToken", () => ({
  AdminStepUpTokenModel: {
    create: (...args: unknown[]) => createTokenRecord(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
  },
}));

import {
  consumeAdminStepUpToken,
  issueAdminStepUpToken,
  isSameOriginRequest,
} from "@/server/admin/step-up";

const session = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "admin" as const,
    emailVerified: true,
  },
  session: {
    id: "session-1",
    userId: "admin-1",
    token: "session-token",
    expiresAt: new Date(Date.now() + 60_000),
  },
};

describe("administrator step-up tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores only a hash and expires after five minutes", async () => {
    createTokenRecord.mockResolvedValue({});
    const expiresAt = await issueAdminStepUpToken({
      token: "raw-one-time-token",
      session,
      action: "order_refund",
      targetId: "order-1",
    });

    const stored = createTokenRecord.mock.calls[0][0] as Record<string, unknown>;
    expect(stored.tokenHash).not.toBe("raw-one-time-token");
    expect(stored).not.toHaveProperty("password");
    expect(stored).not.toHaveProperty("pan");
    expect(stored.userId).toBe("admin-1");
    expect(stored.sessionId).toBe("session-1");
    expect(stored.action).toBe("order_refund");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60_000);
  });

  it("consumes a token only for its bound session, action, and target", async () => {
    const query = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ usedAt: new Date() }),
    });
    findOneAndUpdate.mockImplementation((...args: unknown[]) => query(...args));
    const request = new NextRequest("http://localhost:3000/api/admin/orders/order-1/refund", {
      headers: { cookie: "bb_admin_step_up=one-time-token" },
    });

    await consumeAdminStepUpToken({
      request,
      session,
      action: "order_refund",
      targetId: "order-1",
    });

    const [filter, update] = query.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(filter.userId).toBe("admin-1");
    expect(filter.sessionId).toBe("session-1");
    expect(filter.action).toBe("order_refund");
    expect(filter.targetId).toBe("order-1");
    expect(filter.usedAt).toEqual({ $exists: false });
    expect(update).toHaveProperty("$set.usedAt");
  });

  it("rejects expired, consumed, or incorrectly scoped tokens", async () => {
    findOneAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    const request = new NextRequest("http://localhost:3000/api/admin/orders/order-2/refund", {
      headers: { cookie: "bb_admin_step_up=one-time-token" },
    });

    await expect(
      consumeAdminStepUpToken({
        request,
        session,
        action: "order_refund",
        targetId: "order-2",
      })
    ).rejects.toThrow("Fresh administrator confirmation is required.");
  });

  it("requires a same-origin browser request", () => {
    const valid = new NextRequest(`${siteConfig.url}/api/admin/step-up`, {
      headers: { origin: siteConfig.url },
    });
    const invalid = new NextRequest(`${siteConfig.url}/api/admin/step-up`, {
      headers: { origin: "https://attacker.test" },
    });
    const missing = new NextRequest(`${siteConfig.url}/api/admin/step-up`);

    expect(isSameOriginRequest(valid)).toBe(true);
    expect(isSameOriginRequest(invalid)).toBe(false);
    expect(isSameOriginRequest(missing)).toBe(false);
  });
});
