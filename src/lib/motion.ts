export const motionTokens = {
  feedbackDurationMs: 160,
  entranceDurationMs: 380,
  easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  equalizerEvent: "beatbazaar:equalizer",
} as const;

export interface EqualizerPlaybackEvent {
  trackId: string;
  levels: number[];
}

export function publishEqualizerLevels(event: EqualizerPlaybackEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<EqualizerPlaybackEvent>(motionTokens.equalizerEvent, {
      detail: event,
    })
  );
}
