import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { existsSync } from "node:fs";

export interface TranscodeOptions {
  inputAudioPath: string;
  outputMp3Path: string;
  watermarkWavPath?: string;
  watermarkIntervalSeconds?: number;
  previewDurationSeconds?: number;
}

export interface AudioMetadata {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
}

function runSpawn(command: string, args: string[], timeoutMs = 60000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Command ${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Command ${command} exited with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Extracts audio metadata safely using ffprobe with hardened local arguments.
 */
export async function probeAudio(filePath: string): Promise<AudioMetadata> {
  const args = [
    "-v", "error",
    "-show_entries", "format=duration,bit_rate:stream=sample_rate,channels",
    "-of", "json",
    "-protocol_whitelist", "file",
    filePath,
  ];

  const { stdout } = await runSpawn("ffprobe", args, 15000);
  const data = JSON.parse(stdout);

  const durationSeconds = parseFloat(data.format?.duration || "0");
  const bitrate = parseInt(data.format?.bit_rate || "0", 10);
  const stream = data.streams?.[0] || {};
  const sampleRate = parseInt(stream.sample_rate || "44100", 10);
  const channels = parseInt(stream.channels || "2", 10);

  return { durationSeconds, sampleRate, channels, bitrate };
}

/**
 * Generates ~500 waveform peaks normalized between 0 and 1 using ffmpeg ASTROBE/volumedetect or RMS downsampling.
 */
export async function extractWaveformPeaks(filePath: string, targetPoints = 500): Promise<number[]> {
  // Convert audio to raw 8-bit or 16-bit PCM in memory and downsample
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "beatbazaar-wave-"));
  const rawPcmPath = path.join(tempDir, "mono.raw");

  try {
    const args = [
      "-y",
      "-protocol_whitelist", "file",
      "-i", filePath,
      "-ac", "1",
      "-ar", "4000", // Low sampling rate for fast peak calculation
      "-f", "s16le",
      rawPcmPath,
    ];

    await runSpawn("ffmpeg", args, 30000);

    const buffer = await fs.readFile(rawPcmPath);
    const sampleCount = Math.floor(buffer.length / 2);
    if (sampleCount === 0) {
      return new Array(targetPoints).fill(0);
    }

    const blockSize = Math.max(1, Math.floor(sampleCount / targetPoints));
    const peaks: number[] = [];

    let maxGlobal = 1;
    for (let i = 0; i < targetPoints; i++) {
      let maxBlock = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, sampleCount);

      for (let j = start; j < end; j++) {
        const val = Math.abs(buffer.readInt16LE(j * 2));
        if (val > maxBlock) maxBlock = val;
      }

      if (maxBlock > maxGlobal) maxGlobal = maxBlock;
      peaks.push(maxBlock);
    }

    // Normalize between 0 and 1 and round to 2 decimal places
    return peaks.map((p) => Math.round((p / maxGlobal) * 100) / 100);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Creates the watermarked preview MP3 at 128 kbps.
 * If watermark.wav exists, mixes it at repeating intervals over the full audio.
 * If watermark.wav is missing, generates a 45 second preview and logs a clear warning.
 */
export async function generatePreviewMp3(options: TranscodeOptions): Promise<void> {
  const {
    inputAudioPath,
    outputMp3Path,
    watermarkWavPath = path.resolve(process.cwd(), "worker/assets/watermark.wav"),
    watermarkIntervalSeconds = 20,
    previewDurationSeconds = 45,
  } = options;

  const hasWatermark = existsSync(watermarkWavPath);

  if (!hasWatermark) {
    console.warn(
      `[Audio Transcoder Warning] Watermark asset missing at "${watermarkWavPath}". Generating a ${previewDurationSeconds}s truncated preview instead.`
    );

    const args = [
      "-y",
      "-protocol_whitelist", "file",
      "-i", inputAudioPath,
      "-t", previewDurationSeconds.toString(),
      "-codec:a", "libmp3lame",
      "-b:a", "128k",
      outputMp3Path,
    ];

    await runSpawn("ffmpeg", args, 45000);
    return;
  }

  // Probe duration of main track and watermark
  const meta = await probeAudio(inputAudioPath);
  const totalDuration = meta.durationSeconds || 120;

  // Build repeating watermark mix
  // Using adelay and amix filter
  const delayTimes: number[] = [];
  for (let t = 10; t < totalDuration - 5; t += watermarkIntervalSeconds) {
    delayTimes.push(t * 1000);
  }

  if (delayTimes.length === 0) {
    delayTimes.push(5000);
  }

  // Create input arguments for watermark repeated
  const filterDelays = delayTimes.map((ms, idx) => `[1:a]adelay=${ms}|${ms}[w${idx}]`).join(";");
  const mixInputs = delayTimes.map((_, idx) => `[w${idx}]`).join("");
  const amixFilter = `${filterDelays};[0:a]${mixInputs}amix=inputs=${delayTimes.length + 1}:duration=first:dropout_transition=2[out]`;

  const args = [
    "-y",
    "-protocol_whitelist", "file",
    "-i", inputAudioPath,
    "-i", watermarkWavPath,
    "-filter_complex", amixFilter,
    "-map", "[out]",
    "-codec:a", "libmp3lame",
    "-b:a", "128k",
    outputMp3Path,
  ];

  try {
    await runSpawn("ffmpeg", args, 60000);
  } catch (err: unknown) {
    // If complex filter fails for any reason, fallback to truncated preview with clear warning
    console.warn("[Audio Transcoder Warning] Complex filter watermark mix failed. Falling back to truncated preview.", err);
    const fallbackArgs = [
      "-y",
      "-protocol_whitelist", "file",
      "-i", inputAudioPath,
      "-t", previewDurationSeconds.toString(),
      "-codec:a", "libmp3lame",
      "-b:a", "128k",
      outputMp3Path,
    ];
    await runSpawn("ffmpeg", fallbackArgs, 45000);
  }
}

