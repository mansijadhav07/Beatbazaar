import Link from "next/link";
import { Music2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-muted text-ink mt-auto">
      <div className="mx-auto max-w-container px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand and Mission */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 text-ink font-bold text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-brass">
                <Music2 className="h-3.5 w-3.5" />
              </span>
              <span>Beatbazaar</span>
            </Link>
            <p className="text-sm text-steel-dark max-w-md leading-relaxed">
              Beatbazaar is a marketplace connecting music producers and recording artists.
              Producers set their own license options and terms. Artists can preview
              watermarked audio and review those terms before checkout.
            </p>
            <p className="text-xs text-steel-dark">
              Checkout is currently available in INR in Razorpay test mode.
            </p>
          </div>

          {/* Marketplace Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Marketplace
            </h4>
            <ul className="space-y-2 text-sm text-steel-dark">
              <li>
                <Link href="/tracks" className="hover:text-ink transition-colors">
                  Explore Beats
                </Link>
              </li>
              <li>
                <Link href="/#genres" className="hover:text-ink transition-colors">
                  Browse by Genre
                </Link>
              </li>
              <li>
                <Link href="/license-overview" className="hover:text-ink transition-colors">
                  License overview
                </Link>
              </li>
              <li>
                <Link href="/producer-guidelines" className="hover:text-ink transition-colors">
                  Producer guidelines
                </Link>
              </li>
              <li>
                <Link href="/copyright-and-takedown" className="hover:text-ink transition-colors">
                  Copyright and takedown
                </Link>
              </li>
              <li>
                <Link href="/login?intent=producer" className="hover:text-ink transition-colors">
                  Become a Producer
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal and Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Policies
            </h4>
            <ul className="space-y-2 text-sm text-steel-dark">
              <li>
                <Link href="/terms" className="hover:text-ink transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-ink transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="hover:text-ink transition-colors">
                  Refunds
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="hover:text-ink transition-colors">
                  Digital delivery
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ink transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-steel-dark gap-3">
          <p>
            © {new Date().getFullYear()} Beatbazaar. All rights reserved.
          </p>
          <p className="text-xs text-steel-dark">Checkout is in test mode.</p>
        </div>
      </div>
    </footer>
  );
}
