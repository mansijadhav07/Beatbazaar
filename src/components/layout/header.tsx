"use client";

import Link from "next/link";
import { useState } from "react";
import { Music2, User, Menu, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartContext";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const { itemCount } = useCart();

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === "INR" ? "USD" : "INR"));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-none pt-safe">
      <div className="mx-auto flex h-14 max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-ink font-bold text-lg tracking-tight hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded bg-ink text-brass">
              <Music2 className="h-4 w-4" />
            </span>
            <span className="text-xl font-bold tracking-tight text-ink">
              Beatbazaar
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-steel-dark">
            <Link
              href="/tracks"
              className="transition-colors hover:text-ink"
            >
              Tracks
            </Link>
            <Link
              href="/#genres"
              className="transition-colors hover:text-ink"
            >
              Genres
            </Link>
            <Link
              href="/#licenses"
              className="transition-colors hover:text-ink"
            >
              Licenses
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Currency Switcher */}
          <button
            type="button"
            onClick={toggleCurrency}
            className="hidden sm:inline-flex items-center rounded border border-border px-2.5 py-1 text-xs font-semibold text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
            title="Switch display currency"
          >
            {currency === "INR" ? "INR (₹)" : "USD ($)"}
          </button>

          {/* Cart Link with Badge */}
          <Link
            href="/cart"
            aria-label="View shopping cart"
            className="relative flex h-9 w-9 items-center justify-center rounded border border-border text-steel-dark hover:bg-surface-muted hover:text-ink transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-bold text-ink-dark">
                {itemCount}
              </span>
            )}
          </Link>

          {/* User Account / Sign In */}
          <Link href="/login">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Button>
          </Link>

          {/* Sell Beats CTA */}
          <Link href="/login?intent=producer">
            <Button size="sm" className="hidden sm:inline-flex">
              Sell Beats
            </Button>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex md:hidden p-2 text-steel-dark hover:text-ink"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-surface px-4 py-3 md:hidden space-y-2">
          <Link
            href="/tracks"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-ink hover:text-brass-dark"
          >
            Browse Tracks
          </Link>
          <Link
            href="/#genres"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-ink hover:text-brass-dark"
          >
            Music Genres
          </Link>
          <Link
            href="/#licenses"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-ink hover:text-brass-dark"
          >
            License Tiers
          </Link>
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <button
              type="button"
              onClick={toggleCurrency}
              className="text-xs font-semibold text-steel-dark border border-border px-2 py-1 rounded"
            >
              Currency: {currency}
            </button>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-ink"
            >
              Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
