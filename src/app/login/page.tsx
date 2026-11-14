import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Beatbazaar to access your beats, licenses, and producer dashboard.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100dvh_-_14rem)] items-center justify-center text-sm text-steel-dark">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
