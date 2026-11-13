import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In | Beatbazaar",
  description: "Sign in to Beatbazaar to access your beats, licenses, and producer dashboard.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[calc(100vh-14rem)] items-center justify-center text-sm text-steel-dark">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
