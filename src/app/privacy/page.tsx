import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Draft privacy page awaiting legal review.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SupportArticle
      title="Privacy"
      intro="A complete privacy notice has not been approved. This page lists matters that must be documented before launch."
      legalReview
    >
      <SupportSection title="Topics for privacy review">
        <ul className="list-disc space-y-2 pl-6">
          <li>Personal data collected during account, payment, and producer onboarding.</li>
          <li>Purposes, legal bases, processors, and international data transfers.</li>
          <li>Retention periods, access controls, and security incident handling.</li>
          <li>Data access, correction, deletion, and complaint processes.</li>
          <li>Cookie, analytics, and service-provider disclosures.</li>
        </ul>
      </SupportSection>
    </SupportArticle>
  );
}
