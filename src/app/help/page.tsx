import type { Metadata } from "next";
import Link from "next/link";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Help",
  description: "Find help with beat previews, orders, downloads, and reports.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <SupportArticle
      title={`Help with ${siteConfig.name}`}
      intro="Use these pages to find the next step for common tasks."
    >
      <SupportSection title="Buying a beat">
        <p>
          Browse the <Link className="underline" href="/tracks">beat catalog</Link>,
          open a track to compare the producer&apos;s terms, and check the{" "}
          <Link className="underline" href="/faq">frequently asked questions</Link>.
        </p>
      </SupportSection>
      <SupportSection title="Orders and downloads">
        <p>
          Sign in to view your orders. Download access appears after payment is
          verified. Links expire, and you can request a new link from the order
          page.
        </p>
      </SupportSection>
      <SupportSection title="Reporting a beat">
        <p>
          Use the report control on the track page to send a content or copyright
          report for review.
        </p>
      </SupportSection>
      <SupportSection title="Contact details">
        <p>
          Support contact details are available on the{" "}
          <Link className="underline" href="/contact">contact page</Link> when
          configured.
        </p>
      </SupportSection>
    </SupportArticle>
  );
}
