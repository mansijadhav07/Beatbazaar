import type { Metadata } from "next";
import Link from "next/link";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "License overview",
  description: `How ${siteConfig.name} presents producer-defined beat license options.`,
  robots: { index: false, follow: true },
  alternates: { canonical: "/license-overview" },
};

export default function LicenseOverviewPage() {
  return (
    <SupportArticle
      title="License overview"
      intro="Each producer sets the terms, included files, and price for each license on a beat."
      legalReview
    >
      <SupportSection title="Review each listing">
        <p>
          A track page displays the enabled license options, the files included,
          the producer&apos;s terms, and the price before checkout. Availability
          and terms can differ from one beat to another.
        </p>
      </SupportSection>
      <SupportSection title="License categories">
        <ul className="list-disc space-y-2 pl-6">
          <li>Free licenses are available only when enabled by the producer.</li>
          <li>Non-exclusive licenses remain subject to the producer&apos;s listed terms.</li>
          <li>Exclusive availability and the effect of purchase are described on the beat page.</li>
        </ul>
      </SupportSection>
      <p>
        Do not use a beat until you have reviewed its producer-supplied terms.
        The final license wording requires legal review.
      </p>
      <Link href="/tracks" className="font-medium text-ink underline underline-offset-4">
        Browse beats and review their listed licenses
      </Link>
    </SupportArticle>
  );
}
