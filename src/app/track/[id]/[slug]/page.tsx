import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTrackById, getRelatedTracks } from "@/server/catalog/repository";
import { BeatCard, type BeatCardTrack } from "@/components/catalog/BeatCard";
import { TrackAudioPlayer } from "@/components/catalog/TrackAudioPlayer";
import { siteConfig } from "@/config/site";
import { ShieldCheck, FileAudio, Disc3, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

interface TrackPageProps {
  params: Promise<{
    id: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { id } = await params;
  const track = await getTrackById(id);

  if (!track || ["draft", "pending", "rejected"].includes(track.status)) {
    return { title: `Track Not Found | ${siteConfig.name}` };
  }

  if (track.status === "removed") {
    return {
      title: `Beat Removed | ${siteConfig.name}`,
      robots: { index: false, follow: false },
    };
  }

  const isSoldExclusive = track.status === "sold_exclusive";
  const title = `${track.title} by ${track.producerName || "Beatbazaar Producer"} (${track.bpm} BPM ${track.genre} Beat)`;
  const description = `Listen to and license ${track.title}, an authentic ${track.genre} beat in ${track.key} at ${track.bpm} BPM. High-resolution stems and commercial licenses on ${siteConfig.name}.`;

  const coverUrl = track.coverKey
    ? `${siteConfig.publicR2Domain}/${track.coverKey.replace(/^\//, "")}`
    : undefined;

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    robots: isSoldExclusive ? { index: false, follow: true } : { index: true, follow: true },
    alternates: {
      canonical: `${siteConfig.url}/track/${track._id.toString()}/${track.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "music.song",
      images: coverUrl ? [{ url: coverUrl }] : [],
    },
  };
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { id, slug } = await params;
  const track = await getTrackById(id);

  // 1. Unknown ID, Draft, Pending, or Rejected return 404
  if (!track || ["draft", "pending", "rejected"].includes(track.status)) {
    notFound();
  }

  // 2. Removed track returns 410 with similar beats
  if (track.status === "removed") {
    const similarTracks = await getRelatedTracks(
      track._id.toString(),
      track.genre,
      track.producerId,
      4
    );

    const relatedCards: BeatCardTrack[] = similarTracks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      slug: t.slug,
      genre: t.genre,
      bpm: t.bpm,
      coverKey: t.coverKey,
      producerName: t.producerName,
      waveform: t.waveform,
      previewKey: t.files.find((f) => f.kind === "preview")?.r2Key,
      lowestPriceAmount: t.licenses[0]?.price.amount || 0,
      lowestPriceCurrency: t.licenses[0]?.price.currency || "INR",
      playCount: t.playCount,
    }));

    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Beat Removed (410 Gone)</h1>
        <p className="text-xs text-steel mt-2 max-w-md mx-auto">
          This beat has been taken down by the producer or is no longer available on Beatbazaar. Explore similar beats below:
        </p>
        <div className="mt-12 text-left">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4">
            Similar Beats You May Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedCards.map((rc) => (
              <BeatCard key={rc.id} track={rc} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. Canonical 301 redirect if slug does not match
  if (track.slug !== slug) {
    redirect(`/track/${track._id.toString()}/${track.slug}`);
  }

  const isSoldExclusive = track.status === "sold_exclusive";
  const previewFile = track.files.find((f) => f.kind === "preview");
  const coverUrl = track.coverKey
    ? `${siteConfig.publicR2Domain}/${track.coverKey.replace(/^\//, "")}`
    : null;
  const previewUrl = previewFile
    ? `${siteConfig.publicR2Domain}/${previewFile.r2Key.replace(/^\//, "")}`
    : "";

  const relatedTracks = await getRelatedTracks(
    track._id.toString(),
    track.genre,
    track.producerId,
    4
  );

  const relatedCards: BeatCardTrack[] = relatedTracks.map((t) => ({
    id: t._id.toString(),
    title: t.title,
    slug: t.slug,
    genre: t.genre,
    bpm: t.bpm,
    coverKey: t.coverKey,
    producerName: t.producerName,
    waveform: t.waveform,
    previewKey: t.files.find((f) => f.kind === "preview")?.r2Key,
    lowestPriceAmount: t.licenses[0]?.price.amount || 0,
    lowestPriceCurrency: t.licenses[0]?.price.currency || "INR",
    playCount: t.playCount,
  }));

  // Build JSON-LD structured data
  const jsonLdOffers = isSoldExclusive
    ? []
    : track.licenses
        .filter((l) => l.enabled)
        .map((l) => ({
          "@type": "Offer",
          name: l.name,
          price: (l.price.amount / 100).toFixed(2),
          priceCurrency: l.price.currency,
          availability: "https://schema.org/InStock",
          url: `${siteConfig.url}/track/${track._id.toString()}/${track.slug}`,
        }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicRecording",
        "@id": `${siteConfig.url}/track/${track._id.toString()}/${track.slug}#audio`,
        name: track.title,
        genre: track.genre,
        byArtist: {
          "@type": "MusicGroup",
          name: track.producerName || "Beatbazaar Producer",
        },
        duration: "PT3M",
        image: coverUrl,
      },
      {
        "@type": "Product",
        "@id": `${siteConfig.url}/track/${track._id.toString()}/${track.slug}#product`,
        name: `${track.title} (License & Audio)`,
        description: `Commercial license rights and stems for ${track.title}.`,
        image: coverUrl,
        offers: jsonLdOffers,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteConfig.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tracks",
            item: `${siteConfig.url}/tracks`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: track.title,
            item: `${siteConfig.url}/track/${track._id.toString()}/${track.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Sold Exclusive Notice */}
        {isSoldExclusive && (
          <div className="mb-6 rounded-lg border border-border bg-surface-muted p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-steel flex-shrink-0" />
            <div className="text-xs text-ink leading-relaxed">
              <span className="font-bold">Exclusive Rights Acquired:</span> This beat has been sold exclusively and is no longer available for licensing. Auditioning is retained for archive purposes.
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start pb-8 border-b border-border">
          {/* Cover Art */}
          <div className="h-44 w-44 sm:h-52 sm:w-52 rounded-lg bg-surface-muted border border-border overflow-hidden flex-shrink-0 shadow-sm relative">
            {coverUrl ? (
              <img src={coverUrl} alt={track.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-mono text-sm font-bold text-steel">
                BEAT
              </div>
            )}
          </div>

          {/* Details & Waveform Player */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-2 text-xs font-medium text-brass">
              <span>{track.genre}</span>
              <span>•</span>
              <span>{track.bpm} BPM</span>
              <span>•</span>
              <span>Key: {track.key}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-ink mt-1 truncate">
              {track.title}
            </h1>

            <div className="text-xs text-steel mt-1">
              Produced by{" "}
              <span className="font-semibold text-ink">
                {track.producerName || "Beatbazaar Producer"}
              </span>
              {track.playCount >= siteConfig.minPlayCountThreshold && (
                <span className="ml-2">• {track.playCount.toLocaleString()} plays</span>
              )}
            </div>

            {/* Interactive Player Header */}
            <div className="mt-6">
              <TrackAudioPlayer
                track={{
                  id: track._id.toString(),
                  title: track.title,
                  producerName: track.producerName || "Beatbazaar Producer",
                  genre: track.genre,
                  bpm: track.bpm,
                  coverUrl,
                  previewUrl,
                  waveform: track.waveform,
                  slug: track.slug,
                }}
              />
            </div>
          </div>
        </div>

        {/* License Options Section */}
        <div className="py-12 border-b border-border">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ink">License Options & Rights</h2>
            <p className="text-xs text-steel mt-0.5">
              Instant digital delivery with certified legal license agreement upon purchase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {track.licenses.map((lic) => {
              const isFree = lic.tier === "free";
              const isExclusive = lic.tier === "exclusive";

              return (
                <div
                  key={lic.tier}
                  className={`rounded-lg border p-5 flex flex-col justify-between ${
                    isExclusive ? "border-brass/40 bg-surface-muted/20" : "border-border bg-surface"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">{lic.name}</h3>
                      {isExclusive && (
                        <span className="text-[10px] font-bold text-brass uppercase tracking-wider bg-brass/10 px-2 py-0.5 rounded">
                          Exclusive
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-2xl font-black text-ink">
                      {isFree
                        ? "Free"
                        : `₹${(lic.price.amount / 100).toLocaleString("en-IN")}`}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs text-ink">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-steel flex-shrink-0" />
                        <span>Included: {lic.includedFiles.join(", ").toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Disc3 className="h-4 w-4 text-steel flex-shrink-0" />
                        <span>
                          {isExclusive
                            ? "Sole ownership buyout with stems"
                            : "Streaming, distribution & radio broadcast"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-steel flex-shrink-0" />
                        <span>100% Royalty-Free Commercial Agreement</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    <button
                      disabled
                      className="w-full rounded-md border border-border bg-surface-muted py-2.5 text-xs font-semibold text-steel cursor-not-allowed"
                    >
                      {isSoldExclusive ? "Sold Exclusively" : "Checkout opens soon"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags & Metadata Footer */}
        <div className="py-8 border-b border-border">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-3">
            Moods & Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {track.moods.map((m) => (
              <span
                key={m}
                className="rounded bg-surface-muted px-2.5 py-1 text-xs text-ink border border-border"
              >
                {m}
              </span>
            ))}
            {track.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-surface-muted px-2.5 py-1 text-xs text-steel border border-border"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Related Beats */}
        {relatedCards.length > 0 && (
          <div className="pt-12">
            <h2 className="text-lg font-bold text-ink mb-6">Related Beats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedCards.map((rc) => (
                <BeatCard key={rc.id} track={rc} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
