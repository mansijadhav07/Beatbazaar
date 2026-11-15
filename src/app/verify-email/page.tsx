import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import VerifyEmailContent from "./VerifyEmailContent";

export const metadata = {
  title: `Verify Email | ${siteConfig.name}`,
  description: `Verify your email address to access all features on ${siteConfig.name}.`,
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100dvh_-_14rem)] items-center justify-center text-xs text-steel">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
