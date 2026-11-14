export type UploadFileKind = "mp3" | "wav" | "stems" | "cover";

export const MAX_UPLOAD_BYTES: Record<UploadFileKind, number> = {
  mp3: 200 * 1024 * 1024,
  wav: 1024 * 1024 * 1024,
  stems: 1024 * 1024 * 1024,
  cover: 20 * 1024 * 1024,
};

export function isUploadMimeTypeAllowed(
  kind: UploadFileKind,
  contentType: string
): boolean {
  const allowed: Record<UploadFileKind, readonly string[]> = {
    mp3: ["audio/mpeg", "audio/mp3"],
    wav: ["audio/wav", "audio/x-wav", "audio/wave"],
    stems: ["application/zip", "application/x-zip-compressed"],
    cover: ["image/jpeg", "image/png", "image/webp"],
  };
  return allowed[kind].includes(contentType.toLowerCase());
}

export function isUploadFileTypeCompatible(
  kind: Exclude<UploadFileKind, "cover">,
  mimeType: string
): boolean {
  if (kind === "mp3") return mimeType === "audio/mpeg";
  if (kind === "wav") return mimeType === "audio/wav";
  return mimeType === "application/zip";
}
