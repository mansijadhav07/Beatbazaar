import type { Metadata } from "next";
import { SupportArticle, SupportSection } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Delivery",
  description: "Draft digital delivery page awaiting legal review.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/delivery" },
};

export default function DeliveryPage() {
  return (
    <SupportArticle
      title="Digital delivery"
      intro={`${siteConfig.name} currently runs checkout in test mode. This draft describes the implemented test flow and is not a final delivery policy.`}
      legalReview
    >
      <SupportSection title="Current test flow">
        <p>
          The server makes order downloads available only after it verifies
          payment. Download links are temporary. Buyers can request another link
          from their order page while access remains valid.
        </p>
      </SupportSection>
      <SupportSection title="Before launch">
        <p>
          Legal and accounting review must confirm delivery timing, file
          availability, failed downloads, refunds, and customer support
          procedures.
        </p>
      </SupportSection>
    </SupportArticle>
  );
}
