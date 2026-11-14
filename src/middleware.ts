import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and /admin routes
  const isProtectedPath =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtectedPath) {
    const testRole = request.headers.get("x-playwright-test-role");
    const testSecret = process.env.PLAYWRIGHT_TEST_AUTH_SECRET;
    const isLoopbackHost = ["localhost", "127.0.0.1", "::1"].includes(
      request.nextUrl.hostname
    );
    if (
      process.env.PLAYWRIGHT_TEST_AUTH_ENABLED === "true" &&
      testSecret &&
      isLoopbackHost &&
      request.headers.get("x-playwright-test-secret") === testSecret &&
      ["buyer", "producer", "admin"].includes(testRole || "")
    ) {
      return NextResponse.next();
    }

    const cookies = request.cookies;
    // Better Auth default session tokens
    const hasSessionCookie =
      cookies.has("better-auth.session_token") ||
      cookies.has("__Secure-better-auth.session_token") ||
      Array.from(cookies.getAll()).some((c) =>
        c.name.toLowerCase().includes("session")
      );

    if (!hasSessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
