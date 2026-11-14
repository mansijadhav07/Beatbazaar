import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLandingPage } from "@/components/catalog/PublicLandingPage";
import { getPublicLandingRobots } from "@/lib/public-catalog";
import { getPublicLandingPage } from "@/server/catalog/repository";

export const dynamic = "force-dynamic";

interface ProducerLocationPageProps {
  params: Promise<{ location: string }>;
}

export async function generateMetadata({
  params,
}: ProducerLocationPageProps): Promise<Metadata> {
  const { location } = await params;
  const data = await getPublicLandingPage("producersLocation", location);
  if (!data) return { title: "Location not found", robots: { index: false, follow: false } };
  return {
    title: `Producers in ${data.label}`,
    description: `${data.producers.length} producers with live beats in ${data.label}.`,
    robots: getPublicLandingRobots(data),
    alternates: { canonical: data.path },
  };
}

export default async function ProducerLocationPage({
  params,
}: ProducerLocationPageProps) {
  const { location } = await params;
  const data = await getPublicLandingPage("producersLocation", location);
  if (!data) notFound();
  return <PublicLandingPage snapshot={data} />;
}
