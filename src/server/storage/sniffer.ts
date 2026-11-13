/**
 * Pure helper for file type sniffing based on magic numbers.
 * Safe to run in both Node server and browser environments.
 */
export function sniffFileType(headerBytes: Uint8Array): { mimeType: string; extension: string } | null {
  if (headerBytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // PNG: 89 50 4E 47
  if (
    headerBytes[0] === 0x89 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x4e &&
    headerBytes[3] === 0x47
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // WebP: RIFF ... WEBP
  if (
    headerBytes.length >= 12 &&
    headerBytes[0] === 0x52 &&
    headerBytes[1] === 0x49 &&
    headerBytes[2] === 0x46 &&
    headerBytes[3] === 0x46 &&
    headerBytes[8] === 0x57 &&
    headerBytes[9] === 0x45 &&
    headerBytes[10] === 0x42 &&
    headerBytes[11] === 0x50
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  // WAV: RIFF ... WAVE
  if (
    headerBytes.length >= 12 &&
    headerBytes[0] === 0x52 &&
    headerBytes[1] === 0x49 &&
    headerBytes[2] === 0x46 &&
    headerBytes[3] === 0x46 &&
    headerBytes[8] === 0x57 &&
    headerBytes[9] === 0x41 &&
    headerBytes[10] === 0x56 &&
    headerBytes[11] === 0x45
  ) {
    return { mimeType: "audio/wav", extension: "wav" };
  }

  // MP3: ID3 or sync frame FF FB / FF F3 / FF F2
  if (
    (headerBytes[0] === 0x49 && headerBytes[1] === 0x44 && headerBytes[2] === 0x33) ||
    (headerBytes[0] === 0xff && (headerBytes[1] & 0xe0) === 0xe0)
  ) {
    return { mimeType: "audio/mpeg", extension: "mp3" };
  }

  // ZIP (for stems): 50 4B 03 04 or 50 4B 05 06
  if (
    headerBytes[0] === 0x50 &&
    headerBytes[1] === 0x4b &&
    (headerBytes[2] === 0x03 || headerBytes[2] === 0x05)
  ) {
    return { mimeType: "application/zip", extension: "zip" };
  }

  return null;
}

/**
 * File virus/malware scanner interface.
 * Default is a no-op implementation for Phase 2.
 */
export interface FileScanResult {
  clean: boolean;
  threat?: string;
}

export async function scanFile(_filePath: string): Promise<FileScanResult> {
  // No-op implementation for MVP. Can be plugged into ClamAV or external service later.
  return { clean: true };
}

