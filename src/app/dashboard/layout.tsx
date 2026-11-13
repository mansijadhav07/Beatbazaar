export const dynamic = "force-dynamic";

import { requireRole } from "@/server/auth/guards";
import Link from "next/link";
import { Music, ShoppingBag, DollarSign, User } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(["producer", "buyer", "admin"]);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      {/* Dashboard Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            {user.role === "producer" ? "Producer Dashboard" : "Artist Account"}
          </h1>
          <p className="text-xs sm:text-sm text-steel-dark">
            Signed in as <span className="font-medium text-ink">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded bg-surface-muted border border-border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-ink">
            Role: {user.role}
          </span>
        </div>
      </div>

      {/* Dashboard Sub Navigation */}
      <div className="mt-6 flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded bg-surface-muted px-3 py-2 text-xs font-semibold text-ink"
            >
              <User className="h-4 w-4 text-steel" />
              <span>Overview</span>
            </Link>
            {user.role === "producer" && (
              <>
                <Link
                  href="/dashboard/beats"
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
                >
                  <Music className="h-4 w-4 text-steel" />
                  <span>My Beats</span>
                </Link>
                <Link
                  href="/dashboard/payouts"
                  className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
                >
                  <DollarSign className="h-4 w-4 text-steel" />
                  <span>Earnings & Payouts</span>
                </Link>
              </>
            )}
            <Link
              href="/dashboard/orders"
              className="flex items-center gap-2.5 rounded px-3 py-2 text-xs font-medium text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-steel" />
              <span>Purchased Licenses</span>
            </Link>
          </nav>
        </aside>

        {/* Dashboard Main Content Area */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
