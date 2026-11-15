import type { Metadata } from "next";
import { SupportArticle } from "@/components/support/SupportArticle";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${siteConfig.name} support.`,
  robots: siteConfig.supportEmail
    ? { index: true, follow: true }
    : { index: false, follow: true },
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <SupportArticle
      title={`Contact ${siteConfig.name}`}
      intro="For questions about an order, include the order ID and the email on your buyer account. Do not email payment card details or identity documents."
    >
      {siteConfig.supportEmail ? (
        <p>
          Email support at{" "}
          <a
            className="underline"
            href={`mailto:${siteConfig.supportEmail}`}
          >
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      ) : (
        <p role="status">
          A support email has not been configured. Add
          NEXT_PUBLIC_SUPPORT_EMAIL before publishing contact details.
        </p>
      )}
    </SupportArticle>
  );
}
