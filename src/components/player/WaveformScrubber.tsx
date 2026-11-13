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
    if (!peaks || peaks.length === 0) {
      // Fallback synthetic wave
      return Array.from({ length: targetCount }, (_, i) => 0.2 + 0.6 * Math.abs(Math.sin(i / 6)));
    }

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

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={`relative flex items-center h-8 cursor-pointer select-none group ${className}`}
      role="slider"
      aria-label="Seek waveform"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <div className="flex items-center gap-[2px] w-full h-full">
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

