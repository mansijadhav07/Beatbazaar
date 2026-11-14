import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";

export const metadata: Metadata = {
  title: "Terms",
  description: "Draft terms page awaiting legal review.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <SupportArticle
      title="Terms of service"
      intro="This page is not the final agreement for using Beatbazaar."
      legalReview
    >
      <SupportSection title="Topics for legal review">
        <ul className="list-disc space-y-2 pl-6">
          <li>Eligibility, account responsibilities, and account closure.</li>
          <li>Producer rights, samples, uploads, takedowns, and disputes.</li>
          <li>Buyer licenses, producer-supplied terms, and permitted use.</li>
          <li>Payment, refunds, delivery, and liability language.</li>
          <li>Governing law, complaint handling, and required disclosures.</li>
        </ul>
      </SupportSection>
    </SupportArticle>
  );
}
