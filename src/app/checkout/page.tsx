import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import { siteConfig } from "@/config/site";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Checkout | ${siteConfig.name}`,
  description: "Secure checkout for music production licenses and stems.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CheckoutPage() {
  // Requires user session and verified email
  const session = await requireRole(["buyer", "producer", "admin"], {
    requireVerifiedEmail: true,
  });

  return <CheckoutClient userEmail={session.user.email} />;
}

