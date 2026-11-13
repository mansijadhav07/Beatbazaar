import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import clientPromise from "@/server/db/mongodb";

// Better Auth instance type is inferred from options; any avoids fighting the generic.
type AuthInstance = ReturnType<typeof betterAuth>;

declare global {
  var __betterAuthInstance: AuthInstance | undefined;
}

async function buildAuth(): Promise<AuthInstance> {
  const client = await clientPromise;
  const db = client.db();

  return betterAuth({
    appName: "Beatbazaar",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    secret:
      process.env.BETTER_AUTH_SECRET ||
      "development_secret_must_be_overridden_in_production_32_bytes",
    database: mongodbAdapter(db, { client }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Enable once transactional email is configured
      resetPasswordTokenExpiresIn: 3600,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "buyer",
          input: true,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
  }) as unknown as AuthInstance;
}

let _authInstance: AuthInstance | undefined;

/**
 * Returns the Better Auth instance, initializing it on first call.
 * Defers the MongoDB connection until a request is actually handled.
 * In development, the instance is stored on global to survive HMR reloads.
 */
export async function getAuthInstance(): Promise<AuthInstance> {
  if (process.env.NODE_ENV !== "production") {
    if (!global.__betterAuthInstance) {
      global.__betterAuthInstance = await buildAuth();
    }
    return global.__betterAuthInstance as AuthInstance;
  }

  if (!_authInstance) {
    _authInstance = await buildAuth();
  }
  return _authInstance as AuthInstance;
}
