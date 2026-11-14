import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { OrderModel } from "@/server/db/models/Order";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `My Orders | ${siteConfig.name}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BuyerOrdersPage() {
  const session = await requireRole(["buyer", "producer", "admin"]);

  await connectMongoose();
  const orders = await OrderModel.find({ buyerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const formatPrice = (amount: number, curr: string) => {
    if (curr === "INR") {
      return `₹${Math.round(amount / 100).toLocaleString("en-IN")}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">My Order History</h1>
        <p className="text-xs text-steel mt-1">
          Review previous purchases, re-download eligible files, and open license PDFs with the terms saved at purchase.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded border border-border bg-surface p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-steel">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-ink">You have not placed any orders yet</h2>
          <p className="mt-1 text-xs text-steel">
            Purchased beats and claimed free licenses will appear here.
          </p>
          <div className="mt-6">
            <Link href="/tracks">
              <Button size="sm" className="gap-2">
                <span>Browse Beat Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded border border-border bg-surface overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-muted text-ink font-bold">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items Purchased</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => {
                const dateStr = new Date(o.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <tr key={o._id.toString()} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-steel-dark">
                      #{o._id.toString().slice(-8)}
                    </td>
                    <td className="px-4 py-3.5 text-steel-dark">{dateStr}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-ink">
                        {o.items.map((i) => i.title).join(", ")}
                      </div>
                      <div className="text-[11px] text-steel">
                        {o.items.length} {o.items.length === 1 ? "track" : "tracks"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-ink">
                      {formatPrice(o.totalAmount, o.currency)}
                    </td>
                    <td className="px-4 py-3.5">
                      {o.status === "paid" && (
                        <span className="inline-block rounded bg-status-success-bg px-2 py-0.5 text-[11px] font-bold text-status-success">
                          Paid
                        </span>
                      )}
                      {o.status === "pending" && (
                        <span className="inline-block rounded bg-status-warning-bg px-2 py-0.5 text-[11px] font-bold text-status-warning">
                          Pending
                        </span>
                      )}
                      {o.status === "failed" && (
                        <span className="inline-block rounded bg-status-danger-bg px-2 py-0.5 text-[11px] font-bold text-status-danger">
                          Failed
                        </span>
                      )}
                      {o.status === "refunded" && (
                        <span className="inline-block rounded bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-steel">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/orders/${o._id.toString()}`}>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                          View & Download
                        </Button>
                      </Link>
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
