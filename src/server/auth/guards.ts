import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthInstance } from "./auth";
import type { UserRole } from "@/lib/validations/user";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  image?: string | null;
}

export interface SessionContext {
  user: AuthenticatedUser;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

/**
 * Server-side guard used in Server Components, layouts, and Server Actions.
 * Validates the session and asserts the user holds one of the required roles.
 * Runs on the Node.js runtime only.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionContext> {
  const requestHeaders = await headers();
  const authInstance = await getAuthInstance();
  const session = await authInstance.api.getSession({
    headers: requestHeaders,
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  // role is a custom additionalField not in the base Better Auth user type
  const userRole = ((session.user as Record<string, unknown>).role as UserRole) || "buyer";

  if (!allowedRoles.includes(userRole)) {
    redirect("/?error=unauthorized");
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: userRole,
      emailVerified: session.user.emailVerified,
      image: session.user.image,
    },
    session: {
      id: session.session.id,
      userId: session.session.userId,
      token: session.session.token,
      expiresAt: session.session.expiresAt,
    },
  };
}

/**
 * Lightweight helper to retrieve the current user without redirecting.
 * Returns null when there is no valid session.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const requestHeaders = await headers();
    const authInstance = await getAuthInstance();
    const session = await authInstance.api.getSession({
      headers: requestHeaders,
    });

    if (!session || !session.user) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      // role is a custom additionalField not in the base Better Auth user type
      role: ((session.user as Record<string, unknown>).role as UserRole) || "buyer",
      emailVerified: session.user.emailVerified,
      image: session.user.image,
    };
  } catch {
    return null;
  }
}
