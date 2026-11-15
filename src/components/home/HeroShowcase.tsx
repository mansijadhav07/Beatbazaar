"use client";

import Image from "next/image";
import Link from "next/link";
import { Music, Music2, Music4, Pause, Play } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
import type { BeatCardTrack } from "@/components/catalog/BeatCard";
import { VinylRecord } from "@/components/home/VinylRecord";
import { getPublicAssetUrl } from "@/lib/public-asset-url";

const fallbackBars = [
  30, 52, 38, 70, 46, 84, 40, 62, 90, 48, 72, 34, 80, 56, 94, 44, 66, 36, 78, 50,
  88, 42, 60, 32, 74, 54, 68, 38, 82, 46, 58, 28,
];

function toPlayerTrack(track: BeatCardTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    producerName: track.producerName || "Producer not listed",
    producerUsername: track.producerUsername,
    genre: track.genre,
    bpm: track.bpm,
    coverUrl: track.coverKey ? getPublicAssetUrl(track.coverKey) : null,
    previewUrl: track.previewKey ? getPublicAssetUrl(track.previewKey) : "",
    waveform: track.waveform,
    slug: track.slug,
  };
}

function formatPrice(track: BeatCardTrack): string {
  if (track.lowestPriceAmount === null) return "Unavailable";
  if (track.lowestPriceAmount === 0) return "Free";
  return `From ₹${(track.lowestPriceAmount / 100).toLocaleString("en-IN")}`;
}

function bars(track: BeatCardTrack): number[] {
  const peaks = track.waveform;
  if (!peaks || peaks.length < 8) return fallbackBars;
  const step = peaks.length / 32;
  const max = Math.max(...peaks, 0.0001);
  return Array.from({ length: 32 }, (_, index) =>
    Math.max(18, Math.round((peaks[Math.floor(index * step)] / max) * 100))
  );
}

export function HeroShowcase({ tracks }: { tracks: BeatCardTrack[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const lead = tracks[0];

  if (!lead) {
    return (
      <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
        <VinylRecord className="absolute inset-0 h-full w-full opacity-60" />
        <p className="relative z-10 max-w-[12rem] bg-surface/80 px-2 py-1 text-center text-base text-steel-dark">
          The first beats are on their way. Producers are finishing their listings.
        </p>
      </div>
    );
  }

  const toggle = (track: BeatCardTrack) => {
    if (currentTrack?.id === track.id) togglePlay();
    else playTrack(toPlayerTrack(track));
  };
  const leadPlaying = currentTrack?.id === lead.id && isPlaying;
  const leadCover = lead.coverKey ? getPublicAssetUrl(lead.coverKey) : null;
  const rest = tracks.slice(1, 3);

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto w-full max-w-md sm:max-w-none">
        <div className="vinyl-stage relative mx-auto aspect-square w-[84%] max-w-[26rem]">
          <Music2 aria-hidden="true" className="float-note left-[-4%] top-[10%] h-6 w-6" style={{ animationDelay: "0s" }} />
          <Music4 aria-hidden="true" className="float-note right-[-2%] top-[34%] h-7 w-7" style={{ animationDelay: "-1.6s" }} />
          <Music aria-hidden="true" className="float-note bottom-[6%] left-[2%] h-5 w-5" style={{ animationDelay: "-3.1s" }} />
          <VinylRecord coverUrl={leadCover} fast={leadPlaying} className="h-full w-full" />
          <svg aria-hidden="true" viewBox="0 0 120 200" className="tonearm" data-fast={leadPlaying}>
            <circle cx="88" cy="26" r="16" fill="#1a1428" stroke="#4a3c70" strokeWidth="2" />
            <circle cx="88" cy="26" r="6" fill="#B596FF" />
            <path d="M88 26 L88 120 L52 176" fill="none" stroke="#D9CFF5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="40" y="170" width="22" height="14" rx="3" transform="rotate(-35 51 177)" fill="#7C3AED" />
          </svg>
          <button
            type="button"
            onClick={() => toggle(lead)}
            aria-label={leadPlaying ? `Pause ${lead.title}` : `Play ${lead.title}`}
            className="absolute bottom-0 left-0 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brass text-white shadow-[0_0_0_6px_var(--surface)] transition-transform hover:scale-105 active:scale-95"
          >
            {leadPlaying ? (
              <Pause aria-hidden="true" className="h-6 w-6 fill-current" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 h-6 w-6 fill-current" />
            )}
          </button>
        </div>
        <div className="mt-5 border border-border-strong bg-band p-3">
          <div
            className="showcase-wave flex h-10 items-end gap-[3px]"
            data-playing="true"
            data-fast={leadPlaying}
            aria-hidden="true"
          >
            {bars(lead).map((height, index) => (
              <span
                key={index}
                className="showcase-bar flex-1 rounded-[1px] bg-brass-light"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-data text-[0.6875rem] uppercase tracking-[0.16em] text-brass-light">
                {leadPlaying ? "Now playing" : "Featured beat"}
              </p>
              <Link
                href={`/track/${lead.id}/${lead.slug}`}
                className="block truncate font-display text-base font-bold text-ink hover:text-brass-light"
              >
                {lead.title}
              </Link>
              <p className="truncate text-sm text-steel-dark">
                {lead.producerName || "Producer not listed"}
              </p>
            </div>
            <div className="shrink-0 text-right font-data text-xs text-steel-dark">
              <div>{lead.bpm} BPM</div>
              <div className="mt-0.5 text-sm font-bold text-ink">{formatPrice(lead)}</div>
            </div>
          </div>
        </div>
      </div>

      {rest.length > 0 ? (
        <ol className="grid gap-2 sm:grid-cols-2" aria-label="More beats to preview">
          {rest.map((track) => {
            const active = currentTrack?.id === track.id && isPlaying;
            const cover = track.coverKey ? getPublicAssetUrl(track.coverKey) : null;
            return (
              <li
                key={track.id}
                className="lift flex items-center gap-3 border border-border bg-surface-muted p-2"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-band">
                  {cover ? (
                    <Image src={cover} alt="" fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/track/${track.id}/${track.slug}`}
                    className="block truncate text-sm font-semibold text-ink hover:text-brass-light"
                  >
                    {track.title}
                  </Link>
                  <p className="truncate font-data text-xs text-steel-dark">
                    {track.genre} · {track.bpm} BPM
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(track)}
                  aria-label={active ? `Pause ${track.title}` : `Play ${track.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-ink hover:bg-brass hover:text-white"
                >
                  {active ? (
                    <Pause aria-hidden="true" className="h-4 w-4 fill-current" />
                  ) : (
                    <Play aria-hidden="true" className="ml-0.5 h-4 w-4 fill-current" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
