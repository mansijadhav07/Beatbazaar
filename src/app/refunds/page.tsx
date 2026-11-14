import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";

export const metadata: Metadata = {
  title: "Refunds",
  description: "Draft refund page awaiting legal and accounting review.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <SupportArticle
      title="Refunds"
      intro="A buyer refund policy has not been approved. This page is a review placeholder, not a statement of refund eligibility."
      legalReview
    >
      <SupportSection title="Decisions still required">
        <ul className="list-disc space-y-2 pl-6">
          <li>Eligible reasons, time limits, and evidence requirements.</li>
          <li>How partial refunds, chargebacks, and payment-provider fees are handled.</li>
          <li>When a refund revokes download access and voids a license.</li>
          <li>Required customer notices, records, and tax adjustments.</li>
        </ul>
      </SupportSection>
      <p>
        The configured payout hold is not a buyer refund promise or refund
        deadline. Do not infer refund rights from the producer payout schedule.
      </p>
    </SupportArticle>
  );
}
