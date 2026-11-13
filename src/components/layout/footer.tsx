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
              Producers upload beats and set custom license tiers, while artists preview
              watermarked audio and purchase verified commercial production rights.
            </p>
            <p className="text-xs text-steel-dark">
              Supporting UPI, cards, and net banking in INR, plus international payments in USD.
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
                <Link href="/#licenses" className="hover:text-ink transition-colors">
                  License Comparison
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
                <span className="text-xs text-steel-dark/80">Terms of Service</span>
              </li>
              <li>
                <span className="text-xs text-steel-dark/80">Privacy Policy</span>
              </li>
              <li>
                <span className="text-xs text-steel-dark/80">Refund & Delivery Policy</span>
              </li>
              <li>
                <span className="text-xs text-steel-dark/80">Copyright & Takedown</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-steel-dark gap-3">
          <p>
            © {new Date().getFullYear()} Beatbazaar. All rights reserved.
          </p>
          <p className="text-xs text-steel-dark">
            Direct file storage via Cloudflare R2. Encrypted checkout.
          </p>
        </div>
      </div>
    </footer>
  );
}

