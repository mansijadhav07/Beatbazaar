"use client";

import { useEffect, useRef } from "react";
import type { EqualizerPlaybackEvent } from "@/lib/motion";
import { motionTokens } from "@/lib/motion";

const restingScale = 0.28;

export function BeatEqualizer({
  trackId,
  selected,
  playing,
  hasPeaks,
  className = "",
}: {
  trackId: string;
  selected: boolean;
  playing: boolean;
  hasPeaks: boolean;
  className?: string;
}) {
  const equalizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const equalizer = equalizerRef.current;
    if (!equalizer) return;

    const setRestingLevels = () => {
      equalizer.querySelectorAll<HTMLSpanElement>("span").forEach((bar) => {
        bar.style.transform = `scaleY(${restingScale})`;
      });
    };
    const updateVisibility = () => {
      equalizer.dataset.visible = String(document.visibilityState === "visible");
    };
    const handlePlayback = (event: Event) => {
      const { trackId: activeTrackId, levels } = (
        event as CustomEvent<EqualizerPlaybackEvent>
      ).detail;
      if (activeTrackId !== trackId) return;

      equalizer.querySelectorAll<HTMLSpanElement>("span").forEach((bar, index) => {
        const level = Math.min(1, Math.max(0.18, levels[index] ?? restingScale));
        bar.style.transform = `scaleY(${level})`;
      });
    };

    equalizer.dataset.selected = String(selected);
    equalizer.dataset.playing = String(playing);
    equalizer.dataset.fallback = String(!hasPeaks);
    updateVisibility();
    setRestingLevels();
    window.addEventListener(motionTokens.equalizerEvent, handlePlayback);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      window.removeEventListener(motionTokens.equalizerEvent, handlePlayback);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [hasPeaks, playing, selected, trackId]);

  if (!selected) return null;

  return (
    <div
      ref={equalizerRef}
      className={`equalizer ${className}`}
      aria-hidden="true"
      data-equalizer-track={trackId}
      data-selected="true"
      data-playing={playing ? "true" : "false"}
      data-fallback={hasPeaks ? "false" : "true"}
      data-visible="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
