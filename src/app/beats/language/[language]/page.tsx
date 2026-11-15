import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLandingPage } from "@/components/catalog/PublicLandingPage";
import { getPublicLandingRobots } from "@/lib/public-catalog";
import { getPublicLandingPage } from "@/server/catalog/repository";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

interface LanguagePageProps {
  params: Promise<{ language: string }>;
}

export async function generateMetadata({ params }: LanguagePageProps): Promise<Metadata> {
  const { language } = await params;
  const data = await getPublicLandingPage("language", language);
  if (!data) return { title: "Language not found", robots: { index: false, follow: false } };
  return {
    title: `${data.label} beats`,
    description: `${data.trackCount} published beats tagged ${data.label} in the ${siteConfig.name} catalog.`,
    robots: getPublicLandingRobots(data),
    alternates: { canonical: data.path },
  };
}

export default async function LanguageLandingPage({ params }: LanguagePageProps) {
  const { language } = await params;
  const data = await getPublicLandingPage("language", language);
  if (!data) notFound();
  return <PublicLandingPage snapshot={data} />;
}
