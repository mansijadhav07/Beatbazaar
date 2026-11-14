import { Suspense } from "react";
import ResetPasswordContent from "./ResetPasswordContent";

export const metadata = {
  title: "Reset Password | Beatbazaar",
  description: "Reset your Beatbazaar account password.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100dvh_-_14rem)] items-center justify-center text-xs text-steel">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
