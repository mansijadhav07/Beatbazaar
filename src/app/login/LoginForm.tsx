"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Music2, Lock, Mail, User as UserIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { signIn, signUp } from "@/server/auth/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode =
    searchParams.get("mode") === "signup" || searchParams.get("intent") === "producer"
      ? "signup"
      : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"buyer" | "producer">(
    searchParams.get("intent") === "producer" ? "producer" : "buyer"
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === "signin") {
        const res = await signIn.email({ email, password });

        if (res.error) {
          setErrorMsg(res.error.message || "Failed to sign in. Please verify your credentials.");
          setLoading(false);
          return;
        }

        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.push(redirectUrl);
      } else {
        const res = await signUp.email({
          email,
          password,
          name,
          role,
        } as any);

        if (res.error) {
          setErrorMsg(
            res.error.message || "Failed to create account. Please check your details."
          );
          setLoading(false);
          return;
        }

        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      setErrorMsg("Google authentication is currently being configured.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 font-bold text-lg text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-ink text-brass">
            <Music2 className="h-4 w-4" />
          </span>
          <span className="text-xl">Beatbazaar</span>
        </Link>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {mode === "signin" ? "Sign In to Beatbazaar" : "Create your Beatbazaar Account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Access your purchased beats, downloads, and producer dashboard."
              : "Join as an artist buying production licenses or as a producer selling beats."}
          </CardDescription>

          {/* Mode Switch Tabs */}
          <div className="mt-4 flex rounded border border-border p-1 bg-surface-muted">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
              }}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                mode === "signin"
                  ? "bg-surface text-ink shadow-none border border-border"
                  : "text-steel-dark hover:text-ink"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
              }}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-surface text-ink shadow-none border border-border"
                  : "text-steel-dark hover:text-ink"
              }`}
            >
              Register
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2 rounded border border-status-danger/30 bg-status-danger-bg p-3 text-xs text-status-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink">Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
                    <Input
                      required
                      type="text"
                      placeholder="Producer or Artist name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ink">I want to</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("buyer")}
                      className={`rounded border p-2 text-xs font-medium text-center transition-colors ${
                        role === "buyer"
                          ? "border-steel bg-surface-muted text-ink font-semibold"
                          : "border-border text-steel-dark"
                      }`}
                    >
                      Buy Beat Licenses
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("producer")}
                      className={`rounded border p-2 text-xs font-medium text-center transition-colors ${
                        role === "producer"
                          ? "border-steel bg-surface-muted text-ink font-semibold"
                          : "border-border text-steel-dark"
                      }`}
                    >
                      Sell My Beats
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink">Email Address</label>
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

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink">Password</label>
                {mode === "signin" && (
                  <Link
                    href="/reset-password"
                    className="text-xs text-steel hover:text-ink font-medium"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-dark" />
                <Input
                  required
                  type="password"
                  placeholder={mode === "signup" ? "Minimum 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          {/* Social Sign In Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-steel-dark font-medium">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            className="w-full text-xs font-medium"
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

