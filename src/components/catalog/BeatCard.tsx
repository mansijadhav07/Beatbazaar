"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
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
    <div className="group relative flex flex-col rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-md">
      {/* Cover Artwork & Instant Play Button */}
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface-muted border border-border/50">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ink px-3 text-center text-sm font-medium text-white">
            Artwork not provided
          </div>
        )}

        {/* Play Overlay */}
        <button
          onClick={handlePlayClick}
          aria-label={isThisPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className={`absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-surface shadow-md transition-all active:scale-95 ${
            isThisPlaying
              ? "opacity-100 ring-2 ring-brass"
              : "opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-brass"
          }`}
        >
          {isThisPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/track/${track.id}/${track.slug}`}
            className="text-xs sm:text-sm font-semibold text-ink line-clamp-1 hover:text-brass transition-colors"
          >
            {track.title}
          </Link>
          <div className="mt-0.5 line-clamp-1 text-xs text-steel">
            {track.producerUsername ? (
              <Link
                href={`/producer/${track.producerUsername}`}
                className="hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
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

        <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] text-steel">
            <span className="font-medium text-ink">{track.genre}</span>
            <span>•</span>
            <span>{track.bpm} BPM</span>
            {showPlays && (
              <>
                <span>•</span>
                <span>{track.playCount?.toLocaleString()} plays</span>
              </>
            )}
          </div>

          <div className="font-semibold text-ink">
            {track.lowestPriceAmount === null
              ? "Unavailable"
              : track.lowestPriceAmount === 0
              ? "Free"
              : `₹${(track.lowestPriceAmount / 100).toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>
    </div>
  );
}
