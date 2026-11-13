export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import ProducerProfileForm from "./ProfileForm";

export const metadata = {
  title: "Producer Profile | Beatbazaar",
  description: "Set up your Beatbazaar producer storefront, bio, and location.",
};

export default async function ProducerProfilePage() {
  await requireRole(["producer", "admin"], { requireVerifiedEmail: true });

  return (
    <div className="max-w-2xl">
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-lg font-bold text-ink">Producer Profile & Storefront</h2>
        <p className="text-xs text-steel-dark">
          Configure your public storefront details, handle, and location for discovery.
        </p>
      </div>
      <ProducerProfileForm />
    </div>
  );
}

