"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "/reset-password" }),
      });

      if (!res.ok) {
        throw new Error("Unable to send reset instructions. Please check your email.");
      }

      setSuccessMsg("If an account exists with that email, reset instructions have been sent.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });

      if (!res.ok) {
        throw new Error("Reset token is invalid or expired. Please request a new link.");
      }

      setSuccessMsg("Password updated successfully. Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {token ? "Set New Password" : "Reset Your Password"}
          </CardTitle>
          <CardDescription>
            {token
              ? "Choose a strong password with at least 8 characters."
              : "Enter your account email to receive password reset instructions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded border border-status-danger/30 bg-status-danger-bg p-3 text-xs text-status-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2 rounded border border-brass/30 bg-surface-muted p-3 text-xs text-ink">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-brass mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {token ? (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
                  <Input
                    required
                    type="password"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
                  <Input
                    required
                    type="password"
                    minLength={8}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs">
                {loading ? "Updating..." : "Save Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Account Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
                  <Input
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link href="/login" className="text-xs text-steel hover:text-ink font-medium">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

