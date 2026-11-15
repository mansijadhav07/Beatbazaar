"use client";

import React from "react";
import { Play, Pause } from "lucide-react";
import { useAudioPlayer, type PlayerTrack } from "@/components/player/AudioPlayerContext";
import { LazyWaveformScrubber } from "@/components/player/LazyWaveformScrubber";
import { BeatEqualizer } from "@/components/player/BeatEqualizer";

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
    <div className="border-y border-border bg-surface py-4">
      <div className="flex min-w-0 items-center gap-4">
        <button
          onClick={handleToggle}
          aria-label={isThisPlaying ? "Pause audio preview" : "Play audio preview"}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-brass hover:bg-ink-light active:scale-95 sm:h-10 sm:w-10"
        >
          {isThisPlaying ? (
            <Pause aria-hidden="true" className="h-5 w-5 fill-current" />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between font-data text-xs text-steel-dark">
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
        <BeatEqualizer
          trackId={track.id}
          selected={isCurrent}
          playing={isThisPlaying}
          hasPeaks={Boolean(track.waveform?.length)}
          className="text-steel-dark"
        />
      </div>
    </div>
  );
}
