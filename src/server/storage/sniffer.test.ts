import { describe, it, expect } from "vitest";
import { sniffFileType } from "./sniffer";

describe("File Type Sniffer (Magic Numbers)", () => {
  it("detects JPEG image", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const res = sniffFileType(bytes);
    expect(res?.mimeType).toBe("image/jpeg");
    expect(res?.extension).toBe("jpg");
  });

  it("detects PNG image", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const res = sniffFileType(bytes);
    expect(res?.mimeType).toBe("image/png");
    expect(res?.extension).toBe("png");
  });

  it("detects WAV audio", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    const res = sniffFileType(bytes);
    expect(res?.mimeType).toBe("audio/wav");
    expect(res?.extension).toBe("wav");
  });

  it("detects MP3 audio with ID3 tag", () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
    const res = sniffFileType(bytes);
    expect(res?.mimeType).toBe("audio/mpeg");
    expect(res?.extension).toBe("mp3");
  });

  it("detects ZIP stems file", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const res = sniffFileType(bytes);
    expect(res?.mimeType).toBe("application/zip");
    expect(res?.extension).toBe("zip");
  });

  it("returns null for unrecognized binary formats", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const res = sniffFileType(bytes);
    expect(res).toBeNull();
  });
});

