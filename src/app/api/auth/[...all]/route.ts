import { toNextJsHandler } from "better-auth/next-js";
import { getAuthInstance } from "@/server/auth/auth";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const authInstance = await getAuthInstance();
  const handlers = toNextJsHandler(authInstance);
  return handlers.GET(request);
};

export const POST = async (request: NextRequest) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateLimit = checkRateLimit(`auth:${ip}`, {
    windowMs: 60 * 1000,
    maxRequests: 20,
  });

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: "Too many authentication attempts. Please try again in one minute.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
        },
      }
    );
  }

  // Reject explicit sign-up attempts requesting admin role
  if (request.nextUrl.pathname.includes("/sign-up")) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      if (body && (body.role === "admin" || (typeof body.role === "string" && body.role.toLowerCase() === "admin"))) {
        return NextResponse.json(
          { error: "Admin role cannot be self-assigned during sign-up." },
          { status: 403 }
        );
      }
    } catch {
      // Body may not be JSON or already consumed; continue to handler
    }
  }

  const authInstance = await getAuthInstance();
  const handlers = toNextJsHandler(authInstance);
  return handlers.POST(request);
};
