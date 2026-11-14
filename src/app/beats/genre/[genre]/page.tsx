import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLandingPage } from "@/components/catalog/PublicLandingPage";
import { getPublicLandingRobots } from "@/lib/public-catalog";
import { getPublicLandingPage } from "@/server/catalog/repository";

export const dynamic = "force-dynamic";

interface GenrePageProps {
  params: Promise<{ genre: string }>;
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { genre } = await params;
  const data = await getPublicLandingPage("genre", genre);
  if (!data) return { title: "Genre not found", robots: { index: false, follow: false } };
  return {
    title: `${data.label} beats`,
    description: `${data.trackCount} published ${data.label} beats in the Beatbazaar catalog.`,
    robots: getPublicLandingRobots(data),
    alternates: { canonical: data.path },
  };
}

export default async function GenreLandingPage({ params }: GenrePageProps) {
  const { genre } = await params;
  const data = await getPublicLandingPage("genre", genre);
  if (!data) notFound();
  return <PublicLandingPage snapshot={data} />;
}
