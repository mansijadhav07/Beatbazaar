import type { Metadata } from "next";
import { SupportArticle } from "@/components/support/SupportArticle";
import { CopyrightReportForm } from "@/components/support/CopyrightReportForm";
import { findPublicTracks } from "@/server/catalog/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Report a beat",
  description: "Submit a report about a published Beatbazaar listing.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/report" },
};

export default async function ReportPage() {
  const { tracks } = await findPublicTracks({ limit: 50, sort: "newest" });
  return (
    <SupportArticle
      title="Report a beat"
      intro="Describe a specific concern about a published listing. Include an email address so the review team can follow up."
    >
      <CopyrightReportForm
        tracks={tracks.map((track) => ({
          id: track._id.toString(),
          title: track.title,
        }))}
      />
    </SupportArticle>
  );
}
