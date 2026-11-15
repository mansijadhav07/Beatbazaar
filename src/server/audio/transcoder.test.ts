import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { probeAudio, extractWaveformPeaks, generatePreviewMp3 } from "./transcoder";

describe("FFmpeg Audio Processing Engine", () => {
  let tempDir: string;
  let testSinePath: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "astrylix-test-audio-"));
    testSinePath = path.join(tempDir, "sine-test.wav");

    // Generate a 4-second sine wave at 440Hz test audio
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        "ffmpeg",
        [
          "-y",
          "-f", "lavfi",
          "-i", "sine=frequency=440:duration=4",
          "-c:a", "pcm_s16le",
          testSinePath,
        ],
        { stdio: "ignore" }
      );
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to generate sine test audio: ${code}`));
      });
      proc.on("error", reject);
    });
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it("probes audio duration and channels with ffprobe", async () => {
    const meta = await probeAudio(testSinePath);
    expect(meta.durationSeconds).toBeGreaterThan(3.5);
    expect(meta.channels).toBe(1);
    expect(meta.sampleRate).toBe(44100);
  });

  it("extracts ~500 waveform points bounded between 0 and 1", async () => {
    const peaks = await extractWaveformPeaks(testSinePath, 500);
    expect(peaks.length).toBe(500);
    for (const p of peaks) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("generates a 128 kbps MP3 preview file", async () => {
    const previewOut = path.join(tempDir, "preview.mp3");
    await generatePreviewMp3({
      inputAudioPath: testSinePath,
      outputMp3Path: previewOut,
      watermarkIntervalSeconds: 2,
    });

    const stat = await fs.stat(previewOut);
    expect(stat.size).toBeGreaterThan(1000);

    const probe = await probeAudio(previewOut);
    expect(probe.durationSeconds).toBeGreaterThan(0);
  });
});

