import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Producer Sales & Earnings | ${siteConfig.name}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProducerSalesPage() {
  const session = await requireRole(["producer", "admin"]);

  await connectMongoose();
  const entries = await EarningsLedgerModel.find({ producerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const formatPrice = (amount: number, curr: string) => {
    if (curr === "INR") {
      return `₹${Math.round(amount / 100).toLocaleString("en-IN")}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Compute total earnings across all sales
  const totalGrossInr = entries
    .filter((e) => e.currency === "INR")
    .reduce((sum, e) => sum + e.grossAmount, 0);

  const totalNetInr = entries
    .filter((e) => e.currency === "INR")
    .reduce((sum, e) => sum + e.netAmount, 0);

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Beat Sales & Earnings</h1>
          <p className="text-xs text-steel mt-1">
            Real-time ledger of licenses sold and earnings credited to your producer account.
          </p>
        </div>

        <Link href="/dashboard/beats/new">
          <Button size="sm" className="gap-2">
            <span>Upload New Beat</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs text-steel font-medium">Total Gross Volume</span>
          <div className="text-xl font-bold text-ink mt-1">
            {formatPrice(totalGrossInr, "INR")}
          </div>
        </div>

        <div className="rounded border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs text-steel font-medium">Net Earnings (Pending Payout)</span>
          <div className="text-xl font-bold text-status-success mt-1">
            {formatPrice(totalNetInr, "INR")}
          </div>
        </div>

        <div className="rounded border border-border bg-surface p-4 shadow-sm">
          <span className="text-xs text-steel font-medium">Total License Sales</span>
          <div className="text-xl font-bold text-ink mt-1">
            {entries.filter((e) => e.entryType === "sale").length}
          </div>
        </div>
      </div>

      {/* Notice about payouts */}
      <div className="rounded border border-border bg-surface-muted p-4 text-xs text-steel-dark mb-6 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-steel-dark shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Producer KYC verification and automated bank payouts will open in the upcoming payout release. All earnings are tracked append-only in your immutable ledger.
        </p>
      </div>

      {/* Ledger Table */}
      {entries.length === 0 ? (
        <div className="rounded border border-border bg-surface p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-steel">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-ink">No sales recorded yet</h2>
          <p className="mt-1 text-xs text-steel">
            Once artists license your uploaded beats, your earnings ledger entries will appear here.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/beats">
              <Button variant="outline" size="sm">
                Manage Uploaded Beats
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded border border-border bg-surface overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-muted text-ink font-bold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Beat Title</th>
                <th className="px-4 py-3">License Tier</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Gross Sale</th>
                <th className="px-4 py-3">Platform Fee</th>
                <th className="px-4 py-3">Net Credited</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((e) => {
                const dateStr = new Date(e.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                const isReversal = e.entryType === "reversal";

                return (
                  <tr
                    key={e._id.toString()}
                    className={`hover:bg-surface-muted/50 transition-colors ${
                      isReversal ? "bg-status-danger-bg/20" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-steel-dark">{dateStr}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{e.trackTitle}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-brass px-2 py-0.5 text-xs font-semibold text-ink">
                        {e.licenseTier.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isReversal ? (
                        <span className="text-xs font-bold uppercase text-status-danger">
                          Reversal (Refund)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold uppercase text-status-success">
                          Sale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {formatPrice(e.grossAmount, e.currency)}
                    </td>
                    <td className="px-4 py-3 text-steel">
                      {formatPrice(e.platformFee, e.currency)}
                    </td>
                    <td className={`px-4 py-3 font-bold ${isReversal ? "text-status-danger" : "text-status-success"}`}>
                      {formatPrice(e.netAmount, e.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-steel-dark font-medium">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
