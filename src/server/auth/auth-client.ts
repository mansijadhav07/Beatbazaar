import { createAuthClient } from "better-auth/react";
import { siteConfig } from "@/config/site";

export const EMAIL_DELIVERY_HELP_MESSAGE =
  "Email delivery was rejected. Resend testing mode only allows the account owner's address. Verify a sending domain in Resend, set EMAIL_FROM to an address on that domain, and try again.";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || siteConfig.url,
});

export const { signIn, signUp, signOut, useSession } = authClient;

export async function resendVerificationEmail(email: string): Promise<void> {
  const result = await authClient.sendVerificationEmail({
    email: email.trim(),
    callbackURL: "/dashboard",
  });

  if (result.error) {
    throw new Error(EMAIL_DELIVERY_HELP_MESSAGE);
  }
}
