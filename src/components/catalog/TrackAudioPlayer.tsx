"use client";

import React from "react";
import { Play, Pause } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
import { LazyWaveformScrubber } from "@/components/player/LazyWaveformScrubber";

function formatSeconds(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function TrackAudioPlayer({ track }: { track: PlayerTrack }) {
  const { currentTrack, isPlaying, playTrack, togglePlay, currentTime, duration, seek } =
    useAudioPlayer();

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;
  const activeDuration = isCurrent ? duration : 0;
  const activeTime = isCurrent ? currentTime : 0;

  const handleToggle = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggle}
          aria-label={isThisPlaying ? "Pause audio preview" : "Play audio preview"}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-ink text-surface hover:bg-brass transition-all active:scale-95 shadow-sm"
        >
          {isThisPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-steel font-mono mb-1">
            <span>{formatSeconds(activeTime)}</span>
            <span>{formatSeconds(activeDuration)}</span>
          </div>

          <LazyWaveformScrubber
            peaks={track.waveform}
            currentTime={activeTime}
            duration={activeDuration}
            onSeek={(secs) => {
              if (isCurrent) {
                seek(secs);
              } else {
                playTrack(track);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
