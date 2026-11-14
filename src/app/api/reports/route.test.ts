import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  connectMongoose: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/server/auth/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/server/db/mongoose", () => ({
  connectMongoose: mocks.connectMongoose,
}));
vi.mock("@/server/db/models/Track", () => ({
  TrackModel: { findOne: mocks.findOne },
}));
vi.mock("@/server/db/models/Report", () => ({
  ReportModel: { create: mocks.create },
}));
vi.mock("@/server/admin/step-up", () => ({
  isSameOriginRequest: (request: NextRequest) =>
    request.headers.get("origin") === request.nextUrl.origin,
}));

import { POST } from "./route";

const trackId = "507f1f77bcf86cd799439011";

function makeRequest(
  body: unknown,
  headers: Record<string, string> = { "cf-connecting-ip": "203.0.113.8" }
) {
  return new NextRequest("http://localhost:3000/api/reports", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("public beat reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: trackId, title: "Test beat" }),
      }),
    });
    mocks.create.mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("accepts an anonymous report and stores the contact email without the IP", async () => {
    const response = await POST(
      makeRequest({
        trackId,
        contactEmail: "artist@example.test",
        category: "copyright",
        details: "This listing includes a sample I own.",
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "track-report:203.0.113.8",
      { windowMs: 60_000, maxRequests: 5 }
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: expect.anything(),
        trackTitle: "Test beat",
        reporterEmail: "artist@example.test",
        category: "copyright",
        details: "This listing includes a sample I own.",
        status: "open",
      })
    );
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty("reporterId");
    expect(JSON.stringify(mocks.create.mock.calls)).not.toContain("203.0.113.8");
  });

  it("rejects malformed contact emails before querying the beat", async () => {
    const response = await POST(
      makeRequest({
        trackId,
        contactEmail: "not-an-email",
        category: "copyright",
        details: "This listing includes a sample I own.",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns a rate-limit response to anonymous callers", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({ success: false });
    const response = await POST(
      makeRequest({
        trackId,
        contactEmail: "artist@example.test",
        category: "copyright",
        details: "This listing includes a sample I own.",
      })
    );

    expect(response.status).toBe(429);
    expect(mocks.findOne).not.toHaveBeenCalled();
  });

  it("rejects requests from a different origin", async () => {
    const request = makeRequest(
      {
        trackId,
        contactEmail: "artist@example.test",
        category: "copyright",
        details: "This listing includes a sample I own.",
      },
      { origin: "https://attacker.example", "cf-connecting-ip": "203.0.113.8" }
    );
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
  });
});
