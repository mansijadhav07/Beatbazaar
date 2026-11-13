import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import clientPromise from "@/server/db/mongodb";
import { sendEmail } from "@/server/email";

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
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 3600, // 1 hour
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your Beatbazaar password",
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2>Reset Your Password</h2>
              <p>Hello ${user.name || "there"},</p>
              <p>We received a request to reset your password for your Beatbazaar account. Click the button below to choose a new password:</p>
              <p style="margin: 24px 0;">
                <a href="${url}" style="background-color: #2C3947; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
              </p>
              <p>This link expires in 1 hour. If you did not make this request, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #E8EDF2; margin: 24px 0;" />
              <p style="font-size: 12px; color: #547A95;">Beatbazaar Marketplace</p>
            </div>
          `,
          text: `Reset your Beatbazaar password: ${url}\nThis link expires in 1 hour.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 86400, // 24 hours
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your Beatbazaar account",
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2>Verify Your Email</h2>
              <p>Welcome to Beatbazaar, ${user.name || "there"}!</p>
              <p>Please confirm your email address by clicking the link below:</p>
              <p style="margin: 24px 0;">
                <a href="${url}" style="background-color: #C2A56D; color: #2C3947; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </p>
              <p>This verification link is valid for 24 hours.</p>
              <hr style="border: none; border-top: 1px solid #E8EDF2; margin: 24px 0;" />
              <p style="font-size: 12px; color: #547A95;">Beatbazaar Marketplace</p>
            </div>
          `,
          text: `Verify your Beatbazaar account: ${url}\nThis link expires in 24 hours.`,
        });
      },
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
          input: false, // Security: role cannot be set or modified via client inputs
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
