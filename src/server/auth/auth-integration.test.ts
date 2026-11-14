import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { NextRequest } from "next/server";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock better-auth next handler
const mockSignUpEmail = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: "1", role: "buyer" } })));
const mockUpdateUser = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user: { id: "1", role: "buyer" } })));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: vi.fn().mockResolvedValue(new Response("OK")),
    POST: (req: NextRequest) => {
      if (req.nextUrl.pathname.includes("/sign-up/email")) {
        return mockSignUpEmail(req);
      }
      return mockUpdateUser(req);
    },
  }),
}));

vi.mock("@/server/auth/auth", () => ({
  getAuthInstance: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/server/auth/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 20,
    remaining: 19,
    reset: Date.now() + 60_000,
  }),
}));

describe("Auth Endpoint Role Security Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects sign-up attempts asking for admin role with HTTP 403", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "hacker@example.com",
        password: "password123",
        name: "Hacker",
        role: "admin",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Admin role cannot be self-assigned");
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("rejects update-user attempts setting admin role with HTTP 403", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Normal User",
        role: "admin",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("Admin role cannot be self-assigned");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("passes legitimate sign-up through to auth handler", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "producer@example.com",
        password: "password123",
        name: "Beat Maker",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockSignUpEmail).toHaveBeenCalled();
  });
});
