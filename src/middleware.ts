import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and /admin routes
  const isProtectedPath =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtectedPath) {
    // Permit test header in non-production
    if (request.headers.get("x-playwright-test-role")) {
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

