"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { siteConfig } from "@/config/site";

export interface PlayerTrack {
  id: string;
  title: string;
  producerName: string;
  genre: string;
  bpm: number;
  coverUrl?: string | null;
  previewUrl: string;
  waveform?: number[];
  slug: string;
}

interface AudioPlayerContextType {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: PlayerTrack[];
  repeat: boolean;
  playTrack: (track: PlayerTrack) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleRepeat: () => void;
  setQueue: (tracks: PlayerTrack[]) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);

  // Single HTMLAudioElement ref across entire application
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedSessionsRef = useRef<Set<string>>(new Set());
  const listenTimeRef = useRef<number>(0);
  const currentTrackRef = useRef<PlayerTrack | null>(null);
  const repeatRef = useRef(repeat);
  const nextTrackRef = useRef<() => void>(() => {});
  currentTrackRef.current = currentTrack;
  repeatRef.current = repeat;

  // Initialize audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      listenTimeRef.current = audio.currentTime;

      // Track play counting logic: 30 seconds threshold or full track duration if shorter
      const activeTrack = currentTrackRef.current;
      if (activeTrack && !playedSessionsRef.current.has(activeTrack.id)) {
        const threshold = audio.duration ? Math.min(30, audio.duration - 1) : 30;
        if (audio.currentTime >= threshold && threshold > 0) {
          playedSessionsRef.current.add(activeTrack.id);
          // Send buffered play increment
          fetch(`/api/tracks/${activeTrack.id}/play`, { method: "POST" }).catch(() => {});
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      if (repeatRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrackRef.current();
      }
    };

    const handleError = () => {
      console.warn("Audio playback error encountered. Advancing to next track.");
      setIsPlaying(false);
      nextTrackRef.current();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = useCallback((track: PlayerTrack) => {
    if (!audioRef.current) return;

    if (currentTrack?.id === track.id) {
      if (audioRef.current.paused) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    setCurrentTrack(track);
    audioRef.current.src = track.previewUrl;
    audioRef.current.load();
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn("Autoplay was prevented or audio failed:", err);
        setIsPlaying(false);
      });
  }, [currentTrack]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentTrack]);

  const seek = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const nextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex + 1 < queue.length) {
      playTrack(queue[currentIndex + 1]);
    } else if (repeat && queue.length > 0) {
      playTrack(queue[0]);
    }
  }, [currentTrack, queue, repeat, playTrack]);

  const prevTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1]);
    } else {
      seek(0);
    }
  }, [currentTrack, queue, playTrack, seek]);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => !prev);
  }, []);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.producerName || siteConfig.name,
      album: `${currentTrack.genre} (${currentTrack.bpm} BPM)`,
      artwork: currentTrack.coverUrl
        ? [{ src: currentTrack.coverUrl, sizes: "512x512", type: "image/jpeg" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
  }, [currentTrack, togglePlay, prevTrack, nextTrack, seek]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, currentTime - 5));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(duration, currentTime + 5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, duration, togglePlay, seek]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        queue,
        repeat,
        playTrack,
        togglePlay,
        seek,
        nextTrack,
        prevTrack,
        toggleRepeat,
        setQueue,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return context;
}
