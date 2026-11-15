"use client";

import React, { useRef, useMemo, useState } from "react";

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
  const isScrubbingRef = useRef(false);
  const [previewFraction, setPreviewFraction] = useState<number | null>(null);

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

  const getPointerFraction = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const fraction = getPointerFraction(event);
    if (fraction === null) return;
    isScrubbingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreviewFraction(fraction);
    onSeek(fraction * duration);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const fraction = getPointerFraction(event);
    if (fraction === null) return;
    if (event.pointerType !== "touch" || isScrubbingRef.current) {
      setPreviewFraction(fraction);
    }
    if (isScrubbingRef.current && duration > 0) {
      onSeek(fraction * duration);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    isScrubbingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const formatPreviewTime = (fraction: number) => {
    const seconds = Math.floor(fraction * duration);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        if (!isScrubbingRef.current) setPreviewFraction(null);
      }}
      onKeyDown={handleKeyDown}
      className={`group relative flex h-11 cursor-pointer touch-pan-y select-none items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel sm:h-8 ${className}`}
      role="slider"
      aria-label="Seek waveform"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      aria-valuetext={`${formatPreviewTime(progressFraction)} of ${formatPreviewTime(1)}`}
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
            className="absolute left-0 top-1/2 h-1 w-full origin-left -translate-y-1/2 bg-ink transition-transform duration-100"
            style={{ transform: `translateY(-50%) scaleX(${progressFraction})` }}
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
              className={`flex-1 rounded-sm ${
                isPlayed
                  ? "bg-steel-dark"
                  : "bg-mist-dark"
              }`}
            />
          );
        })}
      </div>
      {previewFraction !== null && duration > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-ink"
          style={{ left: `${previewFraction * 100}%` }}
        >
          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-xs text-white">
            {formatPreviewTime(previewFraction)}
          </span>
        </div>
      )}
    </div>
  );
}
