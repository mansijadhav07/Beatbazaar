"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type LicenseTier } from "@/components/cart/CartContext";
import { siteConfig } from "@/config/site";
import { Trash2, ShieldCheck, ArrowRight, Music2, ShoppingBag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryItem {
  trackId: string;
  licenseTier: LicenseTier;
  title: string;
  producerName: string;
  coverKey: string | null;
  includedFiles?: string[];
  termsText?: string;
  termsVersion?: string;
  price: { amount: number; currency: "INR" | "USD" };
  available: boolean;
  unavailabilityReason?: string;
}

export function CartClient() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart } = useCart();
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      if (cart.length === 0) {
        setSummary([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cart/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((c) => ({
              trackId: c.trackId,
              licenseTier: c.licenseTier,
            })),
            currency,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load cart summary.");
        }

        const data = await res.json();
        setSummary(data.items || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error verifying cart items";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [cart, currency]);

  const availableItems = summary.filter((s) => s.available);
  const hasUnavailable = summary.some((s) => !s.available);
  const totalAmount = availableItems.reduce((sum, item) => sum + item.price.amount, 0);

  const formatPrice = (amountPaiseOrCents: number, curr: "INR" | "USD") => {
    if (curr === "INR") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amountPaiseOrCents / 100);
    }
    return `$${(amountPaiseOrCents / 100).toFixed(2)}`;
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-container px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-steel">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-steel">
          Browse our catalog of authentic beats to license and download stems.
        </p>
        <div className="mt-6">
          <Link href="/tracks">
            <Button size="lg" className="gap-2">
              <span>Explore Beats</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Shopping Cart
          </h1>
          <p className="text-xs text-steel mt-1">
            {cart.length} {cart.length === 1 ? "license" : "licenses"} selected for instant delivery.
          </p>
        </div>

        {siteConfig.internationalPaymentsEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-steel">Currency:</span>
            <div className="inline-flex rounded border border-border p-0.5 bg-surface-muted">
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  currency === "INR" ? "bg-surface text-ink shadow-sm" : "text-steel hover:text-ink"
                }`}
              >
                INR (₹)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-2.5 py-1 text-xs font-bold rounded ${
                  currency === "USD" ? "bg-surface text-ink shadow-sm" : "text-steel hover:text-ink"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded border border-status-danger/30 bg-status-danger-bg p-3 text-xs text-status-danger flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <p className="mt-4 rounded border border-border bg-surface-muted p-3 text-sm text-ink">
        Payments are in Razorpay test mode. No live payment will be collected.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Cart items list */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded border border-border bg-surface-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            summary.map((item) => {
              const coverUrl = item.coverKey
                ? `${siteConfig.publicR2Domain}/${item.coverKey.replace(/^\//, "")}`
                : null;

              return (
                <div
                  key={`${item.trackId}-${item.licenseTier}`}
                  className={`rounded border p-4 transition-colors ${
                    item.available
                      ? "border-border bg-surface hover:border-steel/40"
                      : "border-status-danger/40 bg-status-danger-bg/20"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Cover art preview */}
                    <div className="h-16 w-16 shrink-0 rounded bg-mist-dark overflow-hidden flex items-center justify-center border border-border">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music2 className="h-6 w-6 text-steel" />
                      )}
                    </div>

                    {/* Metadata & Tier */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/track/${item.trackId}/view`}
                            className="text-base font-bold text-ink hover:text-steel transition-colors truncate block"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-steel mt-0.5">
                            By {item.producerName || "Beatbazaar Producer"}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-ink">
                            {item.available
                              ? formatPrice(item.price.amount, item.price.currency)
                              : "Unavailable"}
                          </span>
                        </div>
                      </div>

                      {/* License terms description */}
                      <div className="mt-3 rounded bg-surface-muted p-2.5 text-xs border border-border/60">
                        <div className="flex items-center justify-between font-semibold text-ink-dark">
                          <span>{item.licenseTier.replace("_", " ")} License</span>
                          <span className="text-[11px] text-steel font-normal">
                            Includes: {item.includedFiles?.join(", ").toUpperCase() || "Not specified"}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-steel-dark leading-relaxed">
                          {item.termsText || "License terms are unavailable."}
                        </p>
                      </div>

                      {!item.available && (
                        <p className="mt-2 text-xs font-semibold text-status-danger flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.unavailabilityReason || "This beat is not available for purchase."}</span>
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.trackId, item.licenseTier)}
                          className="inline-flex items-center gap-1 text-steel hover:text-status-danger transition-colors font-medium text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex justify-between items-center pt-2">
            <Link
              href="/tracks"
              className="text-xs font-semibold text-steel hover:text-ink underline"
            >
              Continue Browsing Beats
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-steel hover:text-status-danger transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 rounded border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-base font-bold text-ink">Order Summary</h2>

            <div className="mt-4 space-y-2.5 text-xs text-steel-dark border-b border-border pb-4">
              <div className="flex justify-between">
                <span>Items Subtotal ({availableItems.length})</span>
                <span className="font-semibold text-ink">
                  {formatPrice(totalAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax treatment</span>
                <span className="font-semibold text-ink">LEGAL REVIEW REQUIRED</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-semibold text-status-success">Instant Download</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between text-base font-bold text-ink">
              <span>Total Due</span>
              <span>{formatPrice(totalAmount, currency)}</span>
            </div>

            <p className="mt-2 text-[11px] text-steel leading-relaxed">
              Checkout currency: {currency}. Download access is issued after payment confirmation. Tax treatment is LEGAL REVIEW REQUIRED.
            </p>

            <div className="mt-6">
              <Button
                onClick={() => router.push(`/checkout?currency=${currency}`)}
                disabled={loading || availableItems.length === 0}
                className="w-full gap-2 py-3 text-sm"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {hasUnavailable && (
              <p className="mt-3 text-center text-xs text-status-warning font-medium">
                Please remove unavailable items before continuing.
              </p>
            )}

            <div className="mt-6 border-t border-border pt-4 text-[11px] text-steel space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brass shrink-0" />
                <span>Producer rights confirmation recorded at upload</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brass shrink-0" />
                <span>Secure payment processing via Razorpay</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
