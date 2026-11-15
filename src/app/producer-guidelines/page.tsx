import type { Metadata } from "next";
import Link from "next/link";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Producer guidelines",
  description: `Draft guidance for producers submitting beats to ${siteConfig.name}.`,
  robots: { index: false, follow: true },
  alternates: { canonical: "/producer-guidelines" },
};

export default function ProducerGuidelinesPage() {
  return (
    <SupportArticle
      title="Producer guidelines"
      intro="These draft guidelines explain the information producers provide when listing a beat."
      legalReview
    >
      <SupportSection title="Before submitting a beat">
        <p>
          Upload only music and artwork you have the right to provide. Confirm
          that you control or have cleared the rights needed for the recording
          and any samples.
        </p>
      </SupportSection>
      <SupportSection title="Make each listing clear">
        <p>
          Provide accurate title, genre, BPM, key, language, and mood details.
          Set the available license options, included files, prices, and terms
          before submitting the listing for moderation.
        </p>
      </SupportSection>
      <SupportSection title="Account and payouts">
        <p>
          Producer payout setup requires provider onboarding and review. Never
          send identity or bank details to {siteConfig.name} support. The final seller
          agreement and payout disclosures require legal review.
        </p>
      </SupportSection>
      <Link href="/login?intent=producer" className="font-medium text-ink underline underline-offset-4">
        Open producer registration
      </Link>
    </SupportArticle>
  );
}
