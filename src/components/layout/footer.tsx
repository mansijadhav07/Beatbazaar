import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border text-sm text-ink">
      <div className="mx-auto grid max-w-container gap-3 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-8">
        <p>{siteConfig.name}, licensed beats from independent producers</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link>
          <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
          <Link href="/refunds" className="underline-offset-4 hover:underline">Refunds</Link>
          <Link href="/delivery" className="underline-offset-4 hover:underline">Delivery</Link>
          <Link href="/faq" className="underline-offset-4 hover:underline">FAQ</Link>
          <Link href="/contact" className="underline-offset-4 hover:underline">Contact</Link>
        </nav>
        <p className="text-steel-dark lg:text-right">
          {new Date().getFullYear()} · INR checkout in test mode
        </p>
      </div>
    </footer>
  );
}
