import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLandingPage } from "@/components/catalog/PublicLandingPage";
import { getPublicLandingRobots } from "@/lib/public-catalog";
import { getPublicLandingPage } from "@/server/catalog/repository";

export const dynamic = "force-dynamic";

interface CityBeatPageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityBeatPageProps): Promise<Metadata> {
  const { city } = await params;
  const data = await getPublicLandingPage("cityBeats", city);
  if (!data) return { title: "Location not found", robots: { index: false, follow: false } };
  return {
    title: `Beats from ${data.label}`,
    description: `${data.trackCount} live beats from producers in ${data.label}.`,
    robots: getPublicLandingRobots(data),
    alternates: { canonical: data.path },
  };
}

export default async function CityBeatPage({ params }: CityBeatPageProps) {
  const { city } = await params;
  const data = await getPublicLandingPage("cityBeats", city);
  if (!data) notFound();
  return <PublicLandingPage snapshot={data} />;
}
