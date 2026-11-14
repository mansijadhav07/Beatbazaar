import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  hasTestIdentityAttempt,
  TEST_IDENTITY_HEADER_ROLE,
  verifyTestIdentity,
} from "@/server/auth/test-identity";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and /admin routes
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/checkout" ||
    pathname.startsWith("/orders");

  if (isProtectedPath) {
    // A request that carries test identity headers is a test-identity
    // attempt. Any failure to authenticate through that mechanism is answered
    // with HTTP 404 (nothing here), never a redirect. This prevents an
    // attacker from distinguishing "test auth is off" from "test auth is on
    // but your secret was wrong".
    if (hasTestIdentityAttempt(request.headers)) {
      const identity = await verifyTestIdentity(
        request.headers,
        request.headers.get(TEST_IDENTITY_HEADER_ROLE)
      );
      if (identity) {
        return NextResponse.next();
      }
      return new NextResponse(null, { status: 404 });
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
      loginUrl.searchParams.set(
        "redirect",
        `${pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/checkout",
    "/orders/:path*",
  ],
};