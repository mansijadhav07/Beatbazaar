export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import Link from "next/link";
import { Shield, Users, FileCheck, AlertTriangle, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["admin"]);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-ink text-brass">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
              Beatbazaar Administration Panel
            </h1>
          </div>
          <p className="mt-1 text-xs text-steel-dark">
            Administrator: <span className="font-medium text-ink">{user.name}</span> ({user.email})
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-steel-dark hover:text-ink font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit to Dashboard</span>
        </Link>
      </div>

      <div className="mt-6 flex flex-col md:flex-row gap-6">
        {/* Admin Navigation */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 rounded bg-surface-muted px-3 py-2 text-xs font-semibold text-ink"
            >
              <FileCheck className="h-4 w-4 text-steel" />
              <span>Moderation Queue</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
            >
              <Users className="h-4 w-4 text-steel" />
              <span>Users & KYC</span>
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
            >
              <AlertTriangle className="h-4 w-4 text-steel" />
              <span>Takedowns & Reports</span>
            </Link>
          </nav>
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

