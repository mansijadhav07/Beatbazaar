import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { siteConfig } from "@/config/site";
import "../home.css";

export const metadata: Metadata = {
  title: "License overview",
  description: `How ${siteConfig.name} presents its beat license options.`,
  robots: { index: false, follow: true },
  alternates: { canonical: "/license-overview" },
};

const tiers = [
  {
    name: "Free",
    line: "Listen, credit, share",
    points: [
      "No payment needed",
      "Available only on beats where it is enabled",
      "Credit the producer and respect the listed limits on use",
    ],
  },
  {
    name: "Non-exclusive",
    line: "A license for your release",
    points: [
      "Files, price and usage rights are set per beat",
      "The same beat can be licensed to other artists",
      "Terms are shown in full on the track page",
    ],
  },
  {
    name: "Exclusive",
    line: "Take the beat off sale",
    points: [
      "The beat leaves sale once the purchase completes",
      "Its other licenses are withdrawn",
      "Availability and effect are described on the beat page",
    ],
    featured: true,
  },
];

export default function LicenseOverviewPage() {
  return (
    <div className="home-stage">
      <div className="mx-auto w-full max-w-container px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <header className="hero-enter max-w-2xl">
          <p className="font-data text-xs uppercase tracking-[0.18em] text-brass-light">Licenses</p>
          <h1 className="mt-3 font-display text-[1.75rem] font-black leading-[1.12] tracking-[-0.04em] text-ink sm:text-[2.5rem]">
            Pick the license that fits your release
          </h1>
          <p className="mt-4 text-base leading-7 text-steel-dark sm:text-lg">
            Every beat lists its enabled licenses, included files, terms and price before checkout.
            Availability and terms can differ from one beat to another.
          </p>
          <p
            role="note"
            className="mt-6 border border-border-strong bg-surface-muted px-4 py-3 text-sm font-medium leading-6 text-ink"
          >
            LEGAL REVIEW REQUIRED. This draft is not a final policy. Do not rely on it as legal advice or
            enable live payments until it is approved.
          </p>
        </header>

        <ScrollReveal>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <li
                key={tier.name}
                className={`lift flex flex-col border p-6 ${
                  tier.featured ? "border-brass bg-band" : "border-border bg-surface-muted"
                }`}
              >
                <p className="font-data text-xs uppercase tracking-[0.16em] text-brass-light">{tier.line}</p>
                <h2 className="mt-3 font-display text-2xl font-black text-ink">{tier.name}</h2>
                <ul className="mt-5 space-y-3">
                  {tier.points.map((point) => (
                    <li key={point} className="flex gap-3 text-base leading-6 text-steel-dark">
                      <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brass-light" />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </ScrollReveal>

        <ScrollReveal>
          <section aria-labelledby="license-steps" className="mt-16 border border-border-strong bg-band p-6 sm:p-10">
            <h2 id="license-steps" className="font-display text-xl font-black text-ink sm:text-2xl">
              Before you use a beat
            </h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                "Open the track page and read the license terms for the tier you want.",
                "Check which files are included and what the price covers.",
                "Complete checkout. Your files and license PDF unlock on the order page.",
              ].map((step, index) => (
                <li key={step} className="border-t border-border-strong pt-4">
                  <span className="font-data text-xs text-brass-light">0{index + 1}</span>
                  <p className="mt-2 text-base leading-7 text-steel-dark">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        </ScrollReveal>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/tracks">Browse beats and review their licenses</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/faq">Read the FAQ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
