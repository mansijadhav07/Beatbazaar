export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

import type { Metadata } from "next";
import { requireRole } from "@/server/auth/guards";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import {
  AdminMobileNavigation,
  AdminSidebar,
} from "@/components/admin/AdminNavigation";
import { siteConfig } from "@/config/site";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["admin"]);

  return (
    <div className="mx-auto max-w-container bg-mist p-2 sm:p-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1 rounded-md border border-border bg-surface p-4 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-steel-dark" aria-hidden="true" />
                  <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                    {siteConfig.name} administration
                  </h1>
                </div>
                <p className="mt-1 text-sm text-steel-dark">
                  Signed in as <span className="font-medium text-ink">{user.name}</span> ({user.email})
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-steel-dark hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Exit to dashboard</span>
              </Link>
            </div>
            <div className="mt-5">
              <AdminMobileNavigation />
            </div>
            <main className="mt-5 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
