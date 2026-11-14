"use client";

import dynamic from "next/dynamic";

export const LazyWaveformScrubber = dynamic(
  () => import("./WaveformScrubber").then((module) => module.WaveformScrubber),
  {
    loading: () => <div aria-hidden="true" className="h-11 w-full sm:h-8" />,
  }
);
