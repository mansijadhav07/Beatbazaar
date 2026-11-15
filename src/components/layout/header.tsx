"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { signOut } from "@/server/auth/auth-client";
import type { UserRole } from "@/lib/validations/user";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Wordmark } from "@/components/brand/Wordmark";
import { siteConfig } from "@/config/site";

export function Header({ role }: { role: UserRole | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface pt-safe">
      <div className="mx-auto flex min-h-16 max-w-container items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label={`${siteConfig.name} home`} className="shrink-0">
          <Wordmark />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <Link href="/tracks" className="text-ink hover:text-steel-dark">
            Browse beats
          </Link>
          <Link href="/license-overview" className="text-ink hover:text-steel-dark">
            Licenses
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/cart"
            aria-label="View shopping cart"
            className="relative flex h-11 w-11 items-center justify-center border border-border text-ink hover:bg-surface-muted sm:h-10 sm:w-10"
          >
            <ShoppingCart aria-hidden="true" className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brass px-1 text-xs font-semibold text-ink">
                {itemCount}
              </span>
            )}
          </Link>

          <div className="hidden sm:block">
            <AccountMenu role={role} />
          </div>
          <Link
            href={role === "producer" ? "/dashboard/beats/new" : "/login?intent=producer"}
            className="hidden h-10 items-center justify-center bg-brass px-4 text-sm font-semibold text-ink hover:bg-brass-light sm:inline-flex"
          >
            {role === "producer" ? "Upload a beat" : "Sell beats"}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-11 w-11 items-center justify-center text-ink hover:bg-surface-muted lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav aria-label="Mobile menu" className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-container gap-1">
            <Link
              href="/tracks"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center text-sm font-medium text-ink"
            >
              Browse beats
            </Link>
            <Link
              href="/license-overview"
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center text-sm font-medium text-ink"
            >
              Licenses
            </Link>
            <Link
              href={role === "producer" ? "/dashboard/beats/new" : "/login?intent=producer"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-11 items-center text-sm font-medium text-ink"
            >
              {role === "producer" ? "Upload" : "Sell beats"}
            </Link>
            {role ? (
              <div className="flex flex-col border-t border-border pt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-11 items-center text-sm font-medium text-ink"
                >
                  Dashboard
                </Link>
                {role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center text-sm font-medium text-ink"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    window.location.assign("/");
                  }}
                  className="min-h-11 text-left text-sm font-medium text-ink"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center text-sm font-medium text-ink"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
