"use client";

import { useEffect, useRef } from "react";

const barHeights = [
  14, 22, 30, 18, 38, 28, 46, 22, 54, 35, 62, 29, 48, 68, 34, 56, 74, 44, 60,
  32, 70, 50, 28, 64, 40, 58, 24, 46, 32, 20, 12,
];

export function WaveformMotif() {
  const motifRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const motif = motifRef.current;
    if (!motif || !("IntersectionObserver" in window)) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionState = () => {
      const visible = motif.dataset.visible === "true";
      motif.dataset.running = String(
        visible && document.visibilityState === "visible" && !reducedMotion.matches
      );
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        motif.dataset.visible = String(entry.isIntersecting);
        updateMotionState();
      },
      { threshold: 0.1 }
    );
    const handleVisibility = () => updateMotionState();

    observer.observe(motif);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", updateMotionState);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", updateMotionState);
    };
  }, []);

  return (
    <svg
      ref={motifRef}
      className="hero-waveform h-full w-full text-brass-light"
      viewBox="0 0 640 160"
      role="img"
      aria-label="Waveform motif"
      data-testid="hero-waveform"
      data-running="false"
      data-visible="false"
    >
      <rect x="1" y="1" width="638" height="158" fill="none" stroke="currentColor" />
      {barHeights.map((height, index) => {
        const x = 18 + index * 20;
        const y = 80 - height / 2;
        return (
          <rect
            key={`${x}-${height}`}
            className="hero-waveform-bar"
            x={x}
            y={y}
            width="5"
            height={height}
            rx="2"
            fill="currentColor"
          />
        );
      })}
      <path d="M18 127H622" stroke="currentColor" strokeOpacity="0.35" />
    </svg>
  );
}
