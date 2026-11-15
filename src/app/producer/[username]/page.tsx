import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import {
  buildProducerJsonLd,
  isProducerProfileIndexable,
} from "@/lib/public-catalog";
import { getPublicProducerPage } from "@/server/catalog/repository";
import { getPublicAssetUrl } from "@/lib/public-asset-url";

export const dynamic = "force-dynamic";

interface ProducerPageProps {
  params: Promise<{ username: string }>;
}

async function loadProducer(username: string) {
  const data = await getPublicProducerPage(username);
  if (!data) notFound();
  return data;
}

export async function generateMetadata({
  params,
}: ProducerPageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicProducerPage(username);
  if (!data) {
    return {
      title: "Producer not found",
      robots: { index: false, follow: false },
    };
  }
  const indexable = isProducerProfileIndexable(data.trackCount);
  const url = `${siteConfig.url}/producer/${data.profile.username}`;
  return {
    title: `${data.profile.displayName}, producer`,
    description:
      data.profile.bio.trim() ||
      `Explore published beats by ${data.profile.displayName} on ${siteConfig.name}.`,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title: `${data.profile.displayName} | ${siteConfig.name}`,
      description:
        data.profile.bio.trim() ||
        `Explore published beats by ${data.profile.displayName}.`,
      url,
      type: "profile",
      ...(data.profile.avatarKey
        ? {
            images: [
                getPublicAssetUrl(data.profile.avatarKey),
            ],
          }
        : {}),
    },
  };
}

export default async function ProducerPage({ params }: ProducerPageProps) {
  const { username } = await params;
  const data = await loadProducer(username);
  const { profile, tracks } = data;
  const avatarUrl = profile.avatarKey ? getPublicAssetUrl(profile.avatarKey) : null;
  const cards: BeatCardTrack[] = tracks.map((track) => {
    const lowestLicense = track.licenses
      .filter(
        (license) =>
          license.enabled &&
          license.price.currency === "INR" &&
          license.termsText.trim()
      )
      .sort((left, right) => left.price.amount - right.price.amount)[0];
    return {
      id: track._id.toString(),
      title: track.title,
      slug: track.slug,
      genre: track.genre,
      bpm: track.bpm,
      coverKey: track.coverKey,
      producerName: profile.displayName,
      producerUsername: profile.username,
      waveform: track.waveform,
      previewKey: track.files.find((file) => file.kind === "preview")?.r2Key,
      lowestPriceAmount: lowestLicense?.price.amount ?? null,
      lowestPriceCurrency: lowestLicense?.price.currency ?? "INR",
      playCount: track.playCount,
    };
  });
  const jsonLd = buildProducerJsonLd(
    {
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl,
      location: profile.location,
    },
    siteConfig.url
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="mx-auto max-w-container px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-steel-dark">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/" className="underline-offset-4 hover:underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/tracks" className="underline-offset-4 hover:underline">Beats</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{profile.displayName}</li>
          </ol>
        </nav>

        <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-surface-muted">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${profile.displayName} profile`}
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-ink">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-3xl font-semibold text-ink">
              {profile.displayName}
              {profile.verified && (
                <BadgeCheck aria-label="Verified producer" className="h-5 w-5 shrink-0 text-steel" />
              )}
            </h1>
            <p className="mt-2 text-base text-ink">
              {profile.location.city}, {profile.location.state}, {profile.location.country}
            </p>
            {profile.bio && (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-base leading-7 text-ink">
                {profile.bio}
              </p>
            )}
          </div>
        </header>

        <section aria-labelledby="producer-beats-heading" className="pt-8">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="producer-beats-heading" className="text-xl font-semibold text-ink sm:text-2xl">
              Published beats
            </h2>
            <p className="text-sm text-steel-dark">{data.trackCount}</p>
          </div>
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cards.map((track, index) => (
                <BeatCard key={track.id} track={track} priority={index === 0} />
              ))}
            </div>
          ) : (
            <p className="bg-surface-muted p-5 text-base text-ink">
              This producer has no published beats yet.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
