"use client";

import React, { useRef, useMemo } from "react";

interface WaveformScrubberProps {
  peaks?: number[];
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  className?: string;
}

export function WaveformScrubber({
  peaks = [],
  currentTime,
  duration,
  onSeek,
  className = "",
}: WaveformScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize or default peaks array to 100 bars for compact UI rendering
  const bars = useMemo(() => {
    const targetCount = 100;
    if (!peaks?.length) return [];

    if (peaks.length === targetCount) return peaks;

    const step = peaks.length / targetCount;
    const result: number[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(i * step);
      result.push(peaks[idx] || 0.1);
    }
    return result;
  }, [peaks]);

  const progressFraction = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(fraction * duration);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const seekStep = event.shiftKey ? 10 : 5;
    let targetTime: number;
    switch (event.key) {
      case "ArrowLeft":
        targetTime = currentTime - seekStep;
        break;
      case "ArrowRight":
        targetTime = currentTime + seekStep;
        break;
      case "Home":
        targetTime = 0;
        break;
      case "End":
        targetTime = duration;
        break;
      default:
        return;
    }
    event.preventDefault();
    onSeek(Math.max(0, Math.min(duration, targetTime)));
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className={`group relative flex h-11 cursor-pointer touch-manipulation select-none items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel sm:h-8 ${className}`}
      role="slider"
      aria-label="Seek waveform"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      {bars.length === 0 && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-mist"
          />
          <div
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-steel"
            style={{ width: `${progressFraction * 100}%` }}
          />
        </>
      )}
      <div className="relative z-10 flex h-full w-full items-center gap-[2px]">
        {bars.map((bar, idx) => {
          const barFraction = idx / bars.length;
          const isPlayed = barFraction <= progressFraction;
          const heightPercent = Math.max(15, Math.round(bar * 100));

          return (
            <span
              key={idx}
              style={{ height: `${heightPercent}%` }}
              className={`flex-1 rounded-sm transition-colors duration-75 ${
                isPlayed
                  ? "bg-brass group-hover:bg-brass-dark"
                  : "bg-surface-muted border-border group-hover:bg-steel/30"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
