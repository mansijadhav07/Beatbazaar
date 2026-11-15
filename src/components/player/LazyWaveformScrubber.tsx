"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LazyWaveformScrubber = dynamic(
  () => import("./WaveformScrubber").then((module) => module.WaveformScrubber),
  {
    loading: () => <Skeleton className="h-11 w-full sm:h-8" />,
  }
);
