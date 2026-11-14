import type { Metadata } from "next";
import { SupportArticle } from "@/components/support/SupportArticle";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildFaqStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers about previews, producer-defined license options, test checkout, and reporting a beat.",
  alternates: { canonical: "/faq" },
};

const questions = [
  {
    question: "Can I listen before buying?",
    answer:
      "Yes. Published beats have a preview player. Preview audio is watermarked and does not include the original files.",
  },
  {
    question: "What do I receive with a license?",
    answer:
      "Each track page lists the producer-enabled license options, included files, price, and producer-supplied terms. Review those details before choosing a license.",
  },
  {
    question: "When are purchased files available?",
    answer:
      "The order page provides download access after the server verifies payment. Download links expire and can be requested again from the buyer account.",
  },
  {
    question: "Can I make a live payment?",
    answer:
      "No. Checkout is currently configured for Razorpay test mode and INR only. Do not use real payment details.",
  },
  {
    question: "How do I report a beat?",
    answer:
      "Open the beat page and use its report control to submit a copyright or content report.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SupportArticle
        title="Questions about buying and selling beats"
        intro="Straight answers about the current Beatbazaar experience."
      >
        <div className="space-y-5">
          {questions.map(({ question, answer }) => (
            <details key={question} className="group">
              <summary className="cursor-pointer py-2 text-lg font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-steel">
                {question}
              </summary>
              <p className="pt-2 leading-7 text-ink">{answer}</p>
            </details>
          ))}
        </div>
      </SupportArticle>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildFaqStructuredData(questions)),
        }}
      />
    </>
  );
}
