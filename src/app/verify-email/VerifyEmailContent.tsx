"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted border border-border">
            {error ? (
              <AlertCircle className="h-6 w-6 text-status-danger" />
            ) : token ? (
              <CheckCircle2 className="h-6 w-6 text-brass" />
            ) : (
              <Mail className="h-6 w-6 text-steel" />
            )}
          </div>
          <CardTitle className="text-xl">
            {error ? "Verification Link Expired" : token ? "Email Verified" : "Check Your Email"}
          </CardTitle>
          <CardDescription>
            {error
              ? "This verification link is invalid or has expired. Please sign in and request a new link."
              : token
              ? "Your email has been verified. You can now access all producer and buyer features."
              : "We sent a verification link to your registered email address. Please click the link to confirm your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? (
            <Link href="/dashboard" className="block">
              <Button className="w-full text-xs">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full text-xs">
                Back to Sign In
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

