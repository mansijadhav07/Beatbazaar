import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireRoleMock, submitPayoutOnboardingMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  submitPayoutOnboardingMock: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/server/payouts/onboarding", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/payouts/onboarding")>();
  return {
    ...actual,
    submitPayoutOnboarding: submitPayoutOnboardingMock,
  };
});

vi.mock("@/server/payouts/route-gateway", () => ({
  createRouteGateway: vi.fn(),
}));

import { POST } from "./route";

describe("payout onboarding route data minimization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("does not expose sensitive provider errors in logs or responses", async () => {
    const sensitiveValues = [
      "ABCDE1234F",
      "123412341234",
      "1234567890123456",
      "ABCD0123456",
    ];
    requireRoleMock.mockResolvedValue({
      user: { id: "producer-test", email: "producer@example.test" },
    });
    submitPayoutOnboardingMock.mockRejectedValueOnce(
      new Error(sensitiveValues.join(" "))
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new NextRequest(
      "http://localhost:3000/api/producer/payout-onboarding",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const responseBody = await response.text();
    const loggedOutput = JSON.stringify(logError.mock.calls);

    expect(response.status).toBe(502);
    expect(logError).toHaveBeenCalledWith(
      "[Payout Onboarding] Request failed.",
      "Error"
    );
    for (const value of sensitiveValues) {
      expect(responseBody).not.toContain(value);
      expect(loggedOutput).not.toContain(value);
    }
  });
});
