import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import ResetPasswordContent from "./ResetPasswordContent";

export const metadata = {
  title: `Reset Password | ${siteConfig.name}`,
  description: `Reset your ${siteConfig.name} account password.`,
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100dvh_-_14rem)] items-center justify-center text-xs text-steel">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
