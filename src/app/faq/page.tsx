import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildFaqStructuredData } from "@/lib/structured-data";
import { siteConfig } from "@/config/site";
import "../home.css";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about previews, license options, checkout, downloads and reporting a beat.",
  alternates: { canonical: "/faq" },
};

const groups = [
  {
    title: "Listening",
    items: [
      {
        question: "Can I listen before buying?",
        answer:
          "Yes. Published beats have a preview player. Preview audio is watermarked and does not include the original files.",
      },
      {
        question: "Does the player keep going when I browse?",
        answer:
          "Yes. The player bar stays at the bottom of the screen while you move between pages, so you can keep listening while you search.",
      },
    ],
  },
  {
    title: "Licenses",
    items: [
      {
        question: "What do I receive with a license?",
        answer:
          "Each track page lists the enabled license options, included files, price and terms. Review those details before choosing a license.",
      },
      {
        question: "What happens when an exclusive is bought?",
        answer:
          "The beat comes off sale and its other licenses are withdrawn. Licenses already issued to earlier buyers stay valid.",
      },
    ],
  },
  {
    title: "Payment and downloads",
    items: [
      {
        question: "When are purchased files available?",
        answer:
          "The order page provides download access after the server verifies payment. Download links expire and can be requested again from your account.",
      },
      {
        question: "Can I make a live payment?",
        answer:
          "No. Checkout is currently configured for Razorpay test mode and INR only. Do not use real payment details.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        question: "How do I report a beat?",
        answer:
          "Open the beat page and use its report control to submit a copyright or content report.",
      },
    ],
  },
];

const questions = groups.flatMap((group) => group.items);

export default function FaqPage() {
  return (
    <div className="home-stage">
      <div className="mx-auto w-full max-w-container px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <header className="hero-enter max-w-2xl">
          <p className="font-data text-xs uppercase tracking-[0.18em] text-brass-light">FAQ</p>
          <h1 className="mt-3 font-display text-[1.75rem] font-black leading-[1.12] tracking-[-0.04em] text-ink sm:text-[2.5rem]">
            Questions before you buy
          </h1>
          <p className="mt-4 text-base leading-7 text-steel-dark sm:text-lg">
            Straight answers about the current {siteConfig.name} experience.
          </p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <nav aria-label="Question groups" className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 border-l border-border">
              {groups.map((group) => (
                <li key={group.title}>
                  <a
                    href={`#${group.title.toLowerCase().replaceAll(" ", "-")}`}
                    className="-ml-px block border-l border-transparent py-2 pl-4 text-sm font-medium text-steel-dark hover:border-brass-light hover:text-ink"
                  >
                    {group.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {groups.map((group) => {
              const id = group.title.toLowerCase().replaceAll(" ", "-");
              return (
                <ScrollReveal key={group.title}>
                  <section aria-labelledby={id} className="scroll-mt-24">
                    <h2 id={id} className="font-display text-xl font-black text-ink">
                      {group.title}
                    </h2>
                    <div className="mt-4 border-t border-border">
                      {group.items.map((item) => (
                        <details key={item.question} className="faq-item border-b border-border">
                          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-display text-base font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass-light">
                            {item.question}
                            <Plus aria-hidden="true" className="faq-chevron h-5 w-5 shrink-0 text-brass-light" />
                          </summary>
                          <p className="pb-5 pr-8 text-base leading-7 text-steel-dark">{item.answer}</p>
                        </details>
                      ))}
                    </div>
                  </section>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <section className="mt-16 flex flex-col gap-4 border border-brass bg-band p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-xl font-black text-ink">Still have a question?</h2>
            <p className="mt-2 text-base leading-7 text-steel-dark">
              Ask before you buy. Include the beat name if it is about a specific license.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contact">Contact</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/license-overview">Compare licenses</Link>
            </Button>
          </div>
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildFaqStructuredData(questions)),
        }}
      />
    </div>
  );
}
