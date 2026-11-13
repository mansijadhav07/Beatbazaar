import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

export const metadata = {
  title: "Verify Email | Beatbazaar",
  description: "Verify your email address to access all features on Beatbazaar.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-14rem)] items-center justify-center text-xs text-steel">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

