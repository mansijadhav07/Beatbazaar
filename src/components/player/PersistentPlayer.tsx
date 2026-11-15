"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAudioPlayer } from "./AudioPlayerContext";
import { LazyWaveformScrubber } from "./LazyWaveformScrubber";
import { BeatEqualizer } from "./BeatEqualizer";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from "lucide-react";

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function PersistentPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    prevTrack,
    nextTrack,
    repeat,
    toggleRepeat,
  } = useAudioPlayer();

  const [isIos, setIsIos] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Detect iOS to hide hardware volume slider
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleMobile);
  }, []);

  if (!currentTrack) {
    return null;
  }

  return (
    <div
      className="persistent-player fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 bg-ink text-white md:bottom-0"
      role="region"
      aria-label="Audio player"
      data-expanded={isExpanded}
    >
      <div className="mx-auto grid max-w-container grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-6 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 flex-none overflow-hidden bg-ink-light">
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-brass">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="h-7 w-7">
                  <path
                    d="M3 16h4l2-7 4 15 4-19 4 22 4-15 3 8h2"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/track/${currentTrack.id}/${currentTrack.slug}`}
              className="block truncate text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              {currentTrack.title}
            </Link>
            <div className="flex min-w-0 items-center gap-2 truncate text-sm text-white/80">
              {currentTrack.producerUsername ? (
                <Link
                  href={`/producer/${currentTrack.producerUsername}`}
                  className="truncate underline-offset-4 hover:text-white hover:underline"
                >
                  {currentTrack.producerName}
                </Link>
              ) : (
                currentTrack.producerName || "Producer not listed"
              )}
              <span className="font-data text-xs text-white/80">{currentTrack.bpm} BPM</span>
            </div>
          </div>
          <BeatEqualizer
            trackId={currentTrack.id}
            selected
            playing={isPlaying}
            hasPeaks={Boolean(currentTrack.waveform?.length)}
            className="hidden text-brass sm:inline-flex"
          />
        </div>

        <div className="flex items-center justify-end gap-2 lg:justify-center">
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brass text-ink active:scale-95 sm:h-10 sm:w-10"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="h-5 w-5 fill-current" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-white hover:bg-ink-light lg:hidden"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-label={isExpanded ? "Collapse player" : "Expand player"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown aria-hidden="true" className="h-5 w-5" />
            ) : (
              <ChevronUp aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
          <Link
            href={`/track/${currentTrack.id}/${currentTrack.slug}#license-options`}
            className="hidden min-h-11 items-center gap-2 bg-brass px-3 text-sm font-semibold text-ink hover:bg-brass-light sm:inline-flex"
          >
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />
            Choose license
          </Link>
        </div>

        <div className="player-expanded-content col-span-2 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-2">
            <button
              onClick={prevTrack}
              className="flex h-11 w-11 items-center justify-center text-white/80 hover:bg-ink-light hover:text-white"
              aria-label="Previous track"
            >
              <SkipBack aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              onClick={nextTrack}
              className="flex h-11 w-11 items-center justify-center text-white/80 hover:bg-ink-light hover:text-white"
              aria-label="Next track"
            >
              <SkipForward aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`flex h-11 w-11 items-center justify-center ${
                repeat ? "text-brass" : "text-white/80 hover:bg-ink-light hover:text-white"
              }`}
              aria-label="Toggle repeat"
            >
              <Repeat aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2 text-xs text-white/80">
            <span className="w-9 text-right font-data">{formatSeconds(currentTime)}</span>
            <div className="flex-1">
              <LazyWaveformScrubber
                peaks={currentTrack.waveform}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            </div>
            <span className="w-9 font-data">{formatSeconds(duration)}</span>
          </div>

          {!isIos && (
            <div className="hidden items-center justify-end gap-2 text-white/80 lg:flex">
            <button
              onClick={() => setMuted((m) => !m)}
              className="flex h-10 w-10 items-center justify-center hover:bg-ink-light hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Volume2 aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
            </div>
          )}
          <Link
            href={`/track/${currentTrack.id}/${currentTrack.slug}#license-options`}
            className="col-span-2 flex min-h-11 items-center justify-center gap-2 bg-brass px-3 text-sm font-semibold text-ink hover:bg-brass-light sm:hidden"
          >
            <ShoppingBag aria-hidden="true" className="h-4 w-4" />
            Choose license
          </Link>
        </div>
      </div>
    </div>
  );
}
