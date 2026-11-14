import { toNextJsHandler } from "better-auth/next-js";
import { getAuthInstance } from "@/server/auth/auth";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

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

  const rateLimit = await checkRateLimit(`auth:${ip}`, {
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

  // Second defense layer: reject explicit role setting or admin attempts in client payloads
  const path = request.nextUrl.pathname;
  if (path.includes("/sign-up") || path.includes("/update-user")) {
    try {
      const cloned = request.clone();
      const body = await cloned.json();
      if (path.includes("/sign-up/email")) {
        const role = body?.role ?? "buyer";
        const parsedRole = z.enum(["buyer", "producer"]).safeParse(role);
        if (!parsedRole.success && role === "admin") {
          return NextResponse.json(
            { error: "Admin role cannot be self-assigned or updated via client request." },
            { status: 403 }
          );
        }
        if (!parsedRole.success) {
          return NextResponse.json(
            { error: "Role must be buyer or producer." },
            { status: 400 }
          );
        }
      } else if (body && Object.hasOwn(body, "role")) {
        return NextResponse.json(
          {
            error:
              body.role === "admin"
                ? "Admin role cannot be self-assigned or updated via client request."
                : "Role cannot be changed through the profile update endpoint.",
          },
          { status: 403 }
        );
      }
    } catch {
      // Body may not be JSON; continue to handler
    }
  }

  const authInstance = await getAuthInstance();
  const handlers = toNextJsHandler(authInstance);
  return handlers.POST(request);
};
