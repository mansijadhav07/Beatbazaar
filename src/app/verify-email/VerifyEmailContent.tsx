"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  EMAIL_DELIVERY_HELP_MESSAGE,
  resendVerificationEmail,
} from "@/server/auth/auth-client";
import { getSafeReturnPath } from "@/lib/safe-return-path";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const callbackURL = getSafeReturnPath(searchParams.get("callbackURL"));
    const query = new URLSearchParams({ token, callbackURL });
    window.location.replace(`/api/auth/verify-email?${query.toString()}`);
  }, [searchParams, token]);

  const handleResend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      await resendVerificationEmail(email);
      setResendMessage(
        "If an unverified account exists for this address, a new verification link has been sent."
      );
    } catch (error: unknown) {
      setResendError(
        error instanceof Error ? error.message : EMAIL_DELIVERY_HELP_MESSAGE
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh_-_14rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted border border-border">
            {error ? (
              <AlertCircle className="h-6 w-6 text-status-danger" />
            ) : token ? (
              <Mail className="h-6 w-6 text-steel" />
            ) : (
              <Mail className="h-6 w-6 text-steel" />
            )}
          </div>
          <CardTitle className="text-xl">
            {error ? "Verification Link Needs Attention" : token ? "Verifying Your Email" : "Check Your Email"}
          </CardTitle>
          <CardDescription>
            {error
              ? "This verification link is invalid or has expired. Request a new link below."
              : token
              ? "Your verification link is being checked. You will continue when the check is complete."
              : "Open the verification link from your email, or request a new one below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? null : (
            <form onSubmit={handleResend} className="space-y-3">
              <label htmlFor="verification-email" className="block text-sm font-medium text-ink">
                Email Address
              </label>
              <Input
                id="verification-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
              {resendMessage && (
                <p role="status" className="text-sm text-ink">
                  {resendMessage}
                </p>
              )}
              {resendError && (
                <p role="alert" className="text-sm text-status-danger">
                  {resendError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Sending..." : "Resend verification email"}
              </Button>
            </form>
          )}
          <Link href="/login" className="block text-center text-sm text-steel hover:text-ink">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
