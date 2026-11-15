"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
import { BeatEqualizer } from "@/components/player/BeatEqualizer";
import { Chip } from "@/components/ui/chip";
import { siteConfig } from "@/config/site";
import { getPublicAssetUrl } from "@/lib/public-asset-url";

export interface BeatCardTrack {
  id: string;
  title: string;
  slug: string;
  genre: string;
  bpm: number;
  coverKey?: string | null;
  producerName?: string;
  producerUsername?: string;
  waveform?: number[];
  previewKey?: string;
  lowestPriceAmount: number | null;
  lowestPriceCurrency: string;
  playCount?: number;
}

export function BeatCard({
  track,
  priority = false,
}: {
  track: BeatCardTrack;
  priority?: boolean;
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;

  const coverUrl = track.coverKey ? getPublicAssetUrl(track.coverKey) : null;

  const previewUrl = track.previewKey ? getPublicAssetUrl(track.previewKey) : "";

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrent) {
      togglePlay();
    } else {
      const playerItem: PlayerTrack = {
        id: track.id,
        title: track.title,
        producerName: track.producerName || "Producer not listed",
        producerUsername: track.producerUsername,
        genre: track.genre,
        bpm: track.bpm,
        coverUrl,
        previewUrl,
        waveform: track.waveform,
        slug: track.slug,
      };
      playTrack(playerItem);
    }
  };

  const showPlays =
    track.playCount !== undefined && track.playCount >= siteConfig.minPlayCountThreshold;

  return (
    <article className="beat-card group relative flex min-w-0 flex-col border border-border bg-surface p-2.5 sm:p-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-control)] bg-band">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-white">
            <svg aria-hidden="true" viewBox="0 0 120 48" className="h-12 w-28 text-brass-light">
              <path
                d="M3 24h8l5-12 8 26 8-34 8 37 8-24 8 14 8-19 8 30 8-19 8 12 8-18 8 28 8-20 8 12 6-13 6 8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span className="sr-only">Cover art not provided</span>
          </div>
        )}

        {isCurrent && (
          <div className="absolute left-2 top-2 bg-band p-1.5 text-brass-light">
            <BeatEqualizer
              trackId={track.id}
              selected={isCurrent}
              playing={isThisPlaying}
              hasPeaks={Boolean(track.waveform?.length)}
            />
          </div>
        )}
        <button
          onClick={handlePlayClick}
          aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className="beat-card-play absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-band text-brass-light active:scale-95 sm:h-10 sm:w-10"
        >
          {isThisPlaying ? (
            <Pause aria-hidden="true" className="h-5 w-5 fill-current" />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <div className="min-w-0">
          <Link
            href={`/track/${track.id}/${track.slug}`}
            className="block truncate text-sm font-semibold text-ink underline-offset-4 hover:text-steel-dark hover:underline"
          >
            {track.title}
          </Link>
          <div className="mt-1 truncate text-sm text-steel-dark">
            {track.producerUsername ? (
              <Link
                href={`/producer/${track.producerUsername}`}
                className="underline-offset-4 hover:text-ink hover:underline"
                aria-label={`View producer ${track.producerName || "profile"}`}
                onClick={(event) => event.stopPropagation()}
              >
                {track.producerName || "Producer profile"}
              </Link>
            ) : (
              track.producerName || "Producer not listed"
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip className="min-h-7 border-0 bg-mist-light px-2 text-xs">
            {track.genre}
          </Chip>
          <span className="font-data text-xs text-steel-dark">{track.bpm} BPM</span>
          {showPlays ? (
            <span className="text-xs text-steel-dark">
              {track.playCount?.toLocaleString()} plays
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-xs text-steel-dark">From</span>
          <div className="font-data text-sm font-semibold text-ink">
            {track.lowestPriceAmount === null
              ? "Unavailable"
              : track.lowestPriceAmount === 0
                ? "Free"
                : `₹${(track.lowestPriceAmount / 100).toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>
    </article>
  );
}
