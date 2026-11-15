"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertTriangle,
  Music2,
} from "lucide-react";

interface SummaryItem {
  trackId: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
  title: string;
  producerName: string;
  coverKey: string | null;
  price: { amount: number; currency: "INR" | "USD" };
  available: boolean;
  unavailabilityReason?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CheckoutClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { cart, clearCart } = useCart();
  const currency = "INR" as const;
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Razorpay Checkout.js script
  useEffect(() => {
    if (!document.getElementById("razorpay-checkout-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch cart summary
  useEffect(() => {
    async function loadCartSummary() {
      if (cart.length === 0) {
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
          throw new Error(data.error || "Failed to load checkout summary.");
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

    loadCartSummary();
  }, [cart, currency]);

  const availableItems = summary.filter((s) => s.available);
  const totalAmount = availableItems.reduce((sum, item) => sum + item.price.amount, 0);

  const formatPrice = (amountPaiseOrCents: number, curr: "INR" | "USD") => {
    if (curr === "INR") {
      const rupees = Math.round(amountPaiseOrCents / 100);
      return `₹${rupees.toLocaleString("en-IN")}`;
    }
    return `$${(amountPaiseOrCents / 100).toFixed(2)}`;
  };

  const handlePlaceOrder = async () => {
    if (availableItems.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: availableItems.map((item) => ({
            trackId: item.trackId,
            licenseTier: item.licenseTier,
          })),
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "An exclusive license in your cart is currently reserved by another buyer. Please try again in 10 minutes."
          );
        }
        throw new Error(data.error || "Failed to place order.");
      }

      // Free orders are fulfilled immediately
      if (data.isFree) {
        clearCart();
        router.push(`/orders/${data.orderId}`);
        return;
      }

      if (
        data.currency !== currency ||
        data.amountMinorUnits !== totalAmount
      ) {
        throw new Error(
          "A beat price changed while you were checking out. Review the updated total and try again."
        );
      }

      // Paid orders invoke Razorpay modal
      if (!window.Razorpay) {
        throw new Error("Razorpay gateway failed to load. Please check your internet connection and try again.");
      }

      const options = {
        key: data.checkoutKeyId,
        amount: data.amountMinorUnits,
        currency: data.currency,
        name: siteConfig.name,
        description: `Beat License Order #${data.orderId.slice(-6)}`,
        order_id: data.providerOrderId,
        prefill: {
          email: userEmail,
        },
        theme: {
          color: "#2C3947", // ink brand color
        },
        handler: function () {
          clearCart();
          router.push(`/orders/${data.orderId}`);
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setError(response.error?.description || "Payment failed. Please try another method.");
        setSubmitting(false);
      });
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initiating checkout";
      setError(msg);
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-container px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-steel">
          Please select at least one beat license before checking out.
        </p>
        <div className="mt-6">
          <Link href="/tracks">
            <Button size="lg" className="gap-2">
              <span>Browse Beats</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Order Checkout
        </h1>
        <p className="text-xs text-steel mt-1">
          Review your license terms, file attachments, and confirm payment.
        </p>
      </div>
      <p className="mt-4 rounded border border-border bg-surface-muted p-3 text-sm text-ink">
        Payments are in Razorpay test mode. No live payment will be collected.
      </p>

      {error && (
        <div className="mt-6 rounded border border-status-danger/30 bg-status-danger-bg p-4 text-xs text-status-danger flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column: order items */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
            Order Items ({availableItems.length})
          </h2>

          {loading ? (
            <div className="h-32 rounded border border-border bg-surface-muted animate-pulse" />
          ) : (
            availableItems.map((item) => (
              <div
                key={`${item.trackId}-${item.licenseTier}`}
                className="flex items-center gap-4 rounded border border-border bg-surface p-4"
              >
                <div className="h-12 w-12 rounded bg-surface-muted border border-border flex items-center justify-center shrink-0">
                  <Music2 className="h-5 w-5 text-steel" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-ink truncate">{item.title}</h3>
                  <p className="text-xs text-steel">
                    Producer: {item.producerName || `${siteConfig.name} Producer`}
                  </p>
                  <span className="inline-block mt-1 text-xs font-semibold text-ink">
                    {item.licenseTier.toUpperCase()} License
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-ink">
                    {formatPrice(item.price.amount, item.price.currency)}
                  </span>
                </div>
              </div>
            ))
          )}

          <div className="rounded border border-border bg-surface-muted/60 p-4 text-xs space-y-2">
            <h3 className="font-bold text-ink flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-steel-dark" />
              <span>License terms and files</span>
            </h3>
            <p className="text-steel-dark leading-relaxed">
              After payment is verified, your order page provides the purchased files and a PDF snapshot of the license terms. License language is marked LEGAL REVIEW REQUIRED until approved.
            </p>
          </div>
        </div>

        {/* Right column: payment summary */}
        <div className="lg:col-span-5">
          <div className="rounded border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Lock className="h-4 w-4 text-steel-dark" />
              <span>Payment Confirmation</span>
            </h2>

            <div className="mt-4 space-y-3 text-xs text-steel-dark border-b border-border pb-4">
              <div className="flex justify-between">
                <span>Account Email</span>
                <span className="font-semibold text-ink">{userEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-ink">
                  {formatPrice(totalAmount, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax and invoice treatment</span>
                <span className="font-semibold text-ink">LEGAL REVIEW REQUIRED</span>
              </div>
            </div>

            <div className="mt-4 flex justify-between text-lg font-bold text-ink">
              <span>Amount charged now</span>
              <span>{formatPrice(totalAmount, currency)}</span>
            </div>

            <p className="mt-2 text-xs text-steel">
              Charged currency: <strong className="text-ink">INR</strong>. Tax treatment:
              <strong className="text-ink"> LEGAL REVIEW REQUIRED</strong>. No tax is included.
            </p>

            <div className="mt-6">
              <Button
                onClick={handlePlaceOrder}
                disabled={submitting || loading || availableItems.length === 0}
                className="w-full gap-2 py-3 text-sm"
              >
                {submitting ? (
                  <span>Connecting to payment gateway...</span>
                ) : totalAmount === 0 ? (
                  <span>Claim Free Downloads</span>
                ) : (
                  <>
                    <span>Pay {formatPrice(totalAmount, currency)}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/cart"
                className="text-xs text-steel hover:text-ink underline"
              >
                Return to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
