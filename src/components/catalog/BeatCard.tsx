"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Pause } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
import { siteConfig } from "@/config/site";

export interface BeatCardTrack {
  id: string;
  title: string;
  slug: string;
  genre: string;
  bpm: number;
  coverKey?: string | null;
  producerName?: string;
  waveform?: number[];
  previewKey?: string;
  lowestPriceAmount: number | null;
  lowestPriceCurrency: string;
  playCount?: number;
}

export function BeatCard({ track }: { track: BeatCardTrack }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;

  const coverUrl = track.coverKey
    ? `${siteConfig.publicR2Domain}/${track.coverKey.replace(/^\//, "")}`
    : null;

  const previewUrl = track.previewKey
    ? `${siteConfig.publicR2Domain}/${track.previewKey.replace(/^\//, "")}`
    : "";

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrent) {
      togglePlay();
    } else {
      const playerItem: PlayerTrack = {
        id: track.id,
        title: track.title,
        producerName: track.producerName || "Beatbazaar Producer",
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs font-bold text-steel">
            BEAT
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
          <div className="mt-0.5 text-[11px] text-steel line-clamp-1">
            {track.producerName || "Beatbazaar Producer"}
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
