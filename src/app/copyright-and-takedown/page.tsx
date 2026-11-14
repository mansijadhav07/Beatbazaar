import type { Metadata } from "next";
import Link from "next/link";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";

export const metadata: Metadata = {
  title: "Copyright and takedown",
  description: "How to report a beat that may contain infringing or misleading content.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/copyright-and-takedown" },
};

export default function CopyrightAndTakedownPage() {
  return (
    <SupportArticle
      title="Copyright and takedown"
      intro="Use the report form to tell the moderation team about a specific beat or rights concern."
      legalReview
    >
      <SupportSection title="Submit a beat report">
        <p>
          Select the affected listing and provide a factual description of the
          concern. Do not submit confidential identity documents or payment
          credentials through the report form.
        </p>
        <Link href="/report" className="font-medium text-ink underline underline-offset-4">
          Open the Report this beat form
        </Link>
      </SupportSection>
      <SupportSection title="Review and takedown process">
        <p>
          Reports are reviewed by the moderation team. A listing may be
          restricted while a report is reviewed. Detailed notice, counter-notice,
          and appeal requirements must be approved by counsel before launch.
        </p>
      </SupportSection>
    </SupportArticle>
  );
}
