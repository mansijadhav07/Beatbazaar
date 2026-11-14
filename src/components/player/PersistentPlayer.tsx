"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAudioPlayer } from "./AudioPlayerContext";
import { WaveformScrubber } from "./WaveformScrubber";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Persistent Audio Player"
    >
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
        {/* Track Meta & Cover */}
        <div className="flex items-center gap-3 w-full sm:w-64 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded bg-surface-muted border border-border flex-shrink-0 overflow-hidden relative">
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-steel font-mono text-xs">
                BEAT
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/track/${currentTrack.id}/${currentTrack.slug}`}
              className="text-xs sm:text-sm font-semibold text-ink truncate block hover:text-brass transition-colors"
            >
              {currentTrack.title}
            </Link>
            <div className="text-[11px] text-steel truncate">
              {currentTrack.producerName || "Beatbazaar Producer"} • {currentTrack.bpm} BPM
            </div>
          </div>
        </div>

        {/* Center Controls & Waveform Scrubber */}
        <div className="flex-1 w-full max-w-2xl flex flex-col gap-1 items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={prevTrack}
              className="text-steel hover:text-ink transition-colors p-1"
              aria-label="Previous track"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              className="h-8 w-8 rounded-full bg-ink text-surface flex items-center justify-center hover:bg-ink/90 transition-transform active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-steel hover:text-ink transition-colors p-1"
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1 transition-colors ${
                repeat ? "text-brass" : "text-steel hover:text-ink"
              }`}
              aria-label="Toggle repeat"
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="w-full flex items-center gap-2 text-[10px] text-steel font-mono">
            <span className="w-8 text-right">{formatSeconds(currentTime)}</span>
            <div className="flex-1">
              <WaveformScrubber
                peaks={currentTrack.waveform}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            </div>
            <span className="w-8">{formatSeconds(duration)}</span>
          </div>
        </div>

        {/* Right Volume (Hidden on iOS) */}
        {!isIos && (
          <div className="hidden sm:flex items-center gap-2 w-32 justify-end text-steel">
            <button
              onClick={() => setMuted((m) => !m)}
              className="hover:text-ink transition-colors"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
