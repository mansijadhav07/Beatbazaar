"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  Download,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface OrderItem {
  trackId: string;
  title: string;
  producerName: string;
  licenseTier: string;
  termsVersion: string;
  pricePaid: {
    amount: number;
    currency: "INR" | "USD";
  };
}

interface OrderPageClientProps {
  order: {
    id: string;
    status: "pending" | "paid" | "failed" | "refunded";
    currency: "INR" | "USD";
    totalAmount: number;
    paymentRef?: string;
    createdAt: string;
    items: OrderItem[];
  };
}

export function OrderPageClient({ order }: OrderPageClientProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [pollCount, setPollCount] = useState(0);

  // Poll for status update if pending (e.g. waiting for webhook confirmation)
  useEffect(() => {
    if (currentStatus !== "pending" || pollCount >= 10) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== "pending") {
            setCurrentStatus(data.status);
            router.refresh();
          }
        }
      } catch {
        // Silently retry
      }
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentStatus, pollCount, order.id, router]);

  const formatPrice = (amount: number, curr: "INR" | "USD") => {
    if (curr === "INR") {
      return `₹${Math.round(amount / 100).toLocaleString("en-IN")}`;
    }
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      {/* Status Header */}
      <div className="rounded border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-steel">
                Order #{order.id.slice(-8)}
              </span>
              <span className="text-xs text-steel">• {formattedDate}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink mt-1">
              Order Details & Downloads
            </h1>
          </div>

          <div>
            {currentStatus === "paid" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-status-success-bg px-3 py-1 text-xs font-bold text-status-success border border-status-success/30">
                <CheckCircle2 className="h-4 w-4" />
                <span>Payment Confirmed</span>
              </span>
            )}
            {currentStatus === "pending" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-status-warning-bg px-3 py-1 text-xs font-bold text-status-warning border border-status-warning/30">
                <Clock className="h-4 w-4" />
                <span>Awaiting Payment Confirmation</span>
              </span>
            )}
            {currentStatus === "failed" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-status-danger-bg px-3 py-1 text-xs font-bold text-status-danger border border-status-danger/30">
                <AlertTriangle className="h-4 w-4" />
                <span>Payment Failed</span>
              </span>
            )}
            {currentStatus === "refunded" && (
              <span className="inline-flex items-center gap-1.5 rounded bg-surface-muted px-3 py-1 text-xs font-bold text-steel border border-border">
                <span>Order Refunded</span>
              </span>
            )}
          </div>
        </div>

        {currentStatus === "pending" && (
          <div className="mt-4 rounded bg-status-warning-bg/40 border border-status-warning/20 p-4 text-xs text-status-warning">
            <p className="font-semibold">Your payment is being confirmed.</p>
            <p className="mt-1 text-steel-dark">
              This page will automatically refresh once the payment provider acknowledges receipt. If your order remains pending after a few minutes, please check your bank account or contact support.
            </p>
          </div>
        )}

        {currentStatus === "failed" && (
          <div className="mt-4 rounded bg-status-danger-bg/40 border border-status-danger/20 p-4 text-xs text-status-danger">
            <p className="font-semibold">Your order could not be completed.</p>
            <p className="mt-1 text-steel-dark">
              If your payment was debited, it will be automatically refunded by your payment method. You may return to your cart and attempt payment again.
            </p>
          </div>
        )}

        {currentStatus === "refunded" && (
          <div className="mt-4 rounded bg-surface-muted border border-border p-4 text-xs text-steel-dark">
            <p className="font-semibold text-ink">This order has been refunded.</p>
            <p className="mt-1">
              File download links and the saved license terms for this order have been revoked.
            </p>
          </div>
        )}
      </div>

      {/* Items and Downloads */}
      <div className="mt-8">
        <h2 className="text-base font-bold text-ink mb-4">
          Licensed Beats ({order.items.length})
        </h2>

        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div
              key={`${item.trackId}-${idx}`}
              className="rounded border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-ink">{item.title}</h3>
                  <p className="text-xs text-steel mt-0.5">
                    Producer: {item.producerName || `${siteConfig.name} Producer`}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded bg-brass px-2.5 py-0.5 font-semibold text-ink">
                      {item.licenseTier.toUpperCase()} License
                    </span>
                    <span className="text-steel">
                      Terms v{item.termsVersion}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-sm font-bold text-ink">
                    {formatPrice(item.pricePaid.amount, item.pricePaid.currency)}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Paid Orders */}
              {currentStatus === "paid" && (
                <div className="mt-6 border-t border-border pt-4 flex flex-wrap gap-3">
                  <a
                    href={`/api/orders/${order.id}/items/${idx}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      <span>Download Audio Files</span>
                    </Button>
                  </a>

                  <a
                    href={`/api/orders/${order.id}/items/${idx}/license-pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Download License PDF</span>
                    </Button>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="mt-8 flex justify-between items-center text-xs">
        <Link
          href="/dashboard/orders"
          className="text-steel hover:text-ink font-semibold underline"
        >
          View All Your Orders
        </Link>
        <Link
          href="/tracks"
          className="text-steel hover:text-ink font-semibold flex items-center gap-1"
        >
          <span>Explore More Beats</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
