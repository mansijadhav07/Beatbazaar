"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Upload, Music, DollarSign, ShieldCheck } from "lucide-react";

export default function UploadBeatWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Track Metadata
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Trap");
  const [bpm, setBpm] = useState(140);
  const [key, setKey] = useState("C Minor");
  const [moods, setMoods] = useState("Dark, Energetic");
  const [tags, setTags] = useState("hard, 808, trap");

  // Files
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Licenses
  const [nonExclusivePrice, setNonExclusivePrice] = useState(1999); // INR
  const [exclusivePrice, setExclusivePrice] = useState(14999); // INR
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState("");

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mp3File) {
      setErrorMsg("An MP3 audio master is required.");
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rightsConfirmed) {
      setErrorMsg("You must confirm you hold 100% rights to this beat.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setProgressText("Requesting secure storage upload slots...");

    try {
      // 1. Prepare files list for upload-url endpoint
      const uploadFilesPayload: Array<{
        kind: "mp3" | "wav" | "stems" | "cover";
        fileName: string;
        contentType: string;
        size: number;
      }> = [
        {
          kind: "mp3",
          fileName: mp3File!.name,
          contentType: mp3File!.type || "audio/mpeg",
          size: mp3File!.size,
        },
      ];

      if (wavFile) {
        uploadFilesPayload.push({
          kind: "wav",
          fileName: wavFile.name,
          contentType: wavFile.type || "audio/wav",
          size: wavFile.size,
        });
      }

      if (stemsFile) {
        uploadFilesPayload.push({
          kind: "stems",
          fileName: stemsFile.name,
          contentType: stemsFile.type || "application/zip",
          size: stemsFile.size,
        });
      }

      if (coverFile) {
        uploadFilesPayload.push({
          kind: "cover",
          fileName: coverFile.name,
          contentType: coverFile.type || "image/jpeg",
          size: coverFile.size,
        });
      }

      const res = await fetch("/api/tracks/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          bpm,
          key,
          files: uploadFilesPayload,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to initialize upload.");
      }

      const { trackId, uploadUrls } = resData;

      // 2. Upload files directly to R2
      const confirmedFilesPayload: any[] = [];

      // Upload MP3
      setProgressText("Uploading MP3 master...");
      await fetch(uploadUrls.mp3.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mp3File!.type || "audio/mpeg" },
        body: mp3File,
      });
      confirmedFilesPayload.push({
        kind: "mp3",
        key: uploadUrls.mp3.key,
        size: mp3File!.size,
        contentType: mp3File!.type || "audio/mpeg",
        mode: "single",
      });

      // Upload WAV if provided
      if (wavFile && uploadUrls.wav) {
        setProgressText("Uploading WAV master...");
        await fetch(uploadUrls.wav.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": wavFile.type || "audio/wav" },
          body: wavFile,
        });
        confirmedFilesPayload.push({
          kind: "wav",
          key: uploadUrls.wav.key,
          size: wavFile.size,
          contentType: wavFile.type || "audio/wav",
          mode: "single",
        });
      }

      // Upload Stems if provided
      if (stemsFile && uploadUrls.stems) {
        setProgressText("Uploading Stems archive...");
        await fetch(uploadUrls.stems.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": stemsFile.type || "application/zip" },
          body: stemsFile,
        });
        confirmedFilesPayload.push({
          kind: "stems",
          key: uploadUrls.stems.key,
          size: stemsFile.size,
          contentType: stemsFile.type || "application/zip",
          mode: "single",
        });
      }

      // Upload Cover if provided
      let coverPayload: any = undefined;
      if (coverFile && uploadUrls.cover) {
        setProgressText("Uploading cover artwork...");
        await fetch(uploadUrls.cover.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": coverFile.type || "image/jpeg" },
          body: coverFile,
        });
        coverPayload = {
          key: uploadUrls.cover.key,
          size: coverFile.size,
          contentType: coverFile.type || "image/jpeg",
        };
      }

      // 3. Confirm upload & queue background transcoding
      setProgressText("Verifying storage objects and queueing background worker...");
      const confirmRes = await fetch(`/api/tracks/${trackId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          bpm: Number(bpm),
          key,
          moods: moods.split(",").map((s) => s.trim()).filter(Boolean),
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          rightsConfirmed: true,
          cover: coverPayload,
          files: confirmedFilesPayload,
          licenses: [
            {
              tier: "non_exclusive",
              name: "Standard Commercial License",
              price: { amount: nonExclusivePrice * 100, currency: "INR" },
              includedFiles: ["mp3"],
              termsVersion: "1.0",
              enabled: true,
            },
            {
              tier: "exclusive",
              name: "Exclusive Rights Buyout",
              price: { amount: exclusivePrice * 100, currency: "INR" },
              includedFiles: ["mp3", "wav", "stems"],
              termsVersion: "1.0",
              enabled: true,
            },
          ],
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmData.error || "Failed to confirm upload.");
      }

      router.push("/dashboard/beats");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(errorMsg);
    } finally {
      setLoading(false);
      setProgressText("");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 1 ? "bg-ink text-surface" : "bg-surface-muted text-steel"
              }`}
            >
              1
            </span>
            <span className="text-xs font-medium text-ink">Details</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 2 ? "bg-ink text-surface" : "bg-surface-muted text-steel"
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-ink">Audio Files</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 3 ? "bg-ink text-surface" : "bg-surface-muted text-steel"
              }`}
            >
              3
            </span>
            <span className="text-xs font-medium text-ink">Licenses</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded border border-status-danger/30 bg-status-danger-bg p-3 text-xs text-status-danger">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && (
          <div className="mb-4 flex items-center gap-2 rounded border border-border bg-surface-muted p-3 text-xs text-ink">
            <Upload className="h-4 w-4 animate-bounce text-brass" />
            <span>{progressText}</span>
          </div>
        )}

        {/* Step 1: Metadata */}
        {step === 1 && (
          <form onSubmit={handleNextFromStep1} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink">Beat Title</label>
              <Input
                required
                type="text"
                placeholder="e.g. Bombay Nights"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-brass focus:outline-none"
                >
                  <option value="Trap">Trap</option>
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="Drill">Drill</option>
                  <option value="R&B">R&B</option>
                  <option value="Desi Hip Hop">Desi Hip Hop</option>
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Pop">Pop</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">BPM</label>
                <Input
                  required
                  type="number"
                  min={40}
                  max={280}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink">Musical Key</label>
                <Input
                  required
                  type="text"
                  placeholder="e.g. C Minor"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink">Moods (comma separated)</label>
              <Input
                type="text"
                placeholder="Dark, Energetic, Bouncy"
                value={moods}
                onChange={(e) => setMoods(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink">Tags (comma separated)</label>
              <Input
                type="text"
                placeholder="hard, 808, flute"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button type="submit" className="w-full text-xs mt-2">
              Continue to Audio Files
            </Button>
          </form>
        )}

        {/* Step 2: Files */}
        {step === 2 && (
          <form onSubmit={handleNextFromStep2} className="space-y-4">
            <div className="space-y-1 border border-border rounded p-3 bg-surface-muted">
              <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-brass" />
                <span>MP3 Audio Master (Required)</span>
              </label>
              <p className="text-[11px] text-steel">Full quality 320 kbps MP3 master.</p>
              <input
                required
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                className="text-xs text-steel-dark file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-xs file:bg-surface"
              />
            </div>

            <div className="space-y-1 border border-border rounded p-3">
              <label className="text-xs font-medium text-ink">WAV Master (Optional)</label>
              <p className="text-[11px] text-steel">Uncompressed 24-bit 44.1kHz or 48kHz WAV.</p>
              <input
                type="file"
                accept=".wav,audio/wav"
                onChange={(e) => setWavFile(e.target.files?.[0] || null)}
                className="text-xs text-steel-dark file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-xs file:bg-surface"
              />
            </div>

            <div className="space-y-1 border border-border rounded p-3">
              <label className="text-xs font-medium text-ink">Stems Archive (Optional)</label>
              <p className="text-[11px] text-steel">ZIP archive with individual track stems.</p>
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => setStemsFile(e.target.files?.[0] || null)}
                className="text-xs text-steel-dark file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-xs file:bg-surface"
              />
            </div>

            <div className="space-y-1 border border-border rounded p-3">
              <label className="text-xs font-medium text-ink">Cover Artwork (Optional)</label>
              <p className="text-[11px] text-steel">Square image (JPEG/PNG/WebP, min 1000x1000px).</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="text-xs text-steel-dark file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-xs file:bg-surface"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 text-xs">
                Back
              </Button>
              <Button type="submit" className="flex-1 text-xs">
                Continue to Licenses
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Licenses & Submit */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="rounded border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-steel" />
                    <span>Non-Exclusive License (MP3)</span>
                  </span>
                  <span className="text-xs text-steel">INR</span>
                </div>
                <Input
                  required
                  type="number"
                  min={100}
                  value={nonExclusivePrice}
                  onChange={(e) => setNonExclusivePrice(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="rounded border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-steel" />
                    <span>Exclusive Buyout License (All Files)</span>
                  </span>
                  <span className="text-xs text-steel">INR</span>
                </div>
                <Input
                  required
                  type="number"
                  min={1000}
                  value={exclusivePrice}
                  onChange={(e) => setExclusivePrice(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="rounded border border-border p-3 bg-surface-muted">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  required
                  type="checkbox"
                  checked={rightsConfirmed}
                  onChange={(e) => setRightsConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-border text-brass focus:ring-brass"
                />
                <div className="text-xs text-ink leading-relaxed">
                  <span className="font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-brass" />
                    Rights Confirmation
                  </span>
                  I warrant that I am the sole author and owner of this musical composition and sound recording, that all samples have been legally cleared, and that I hold all rights required to grant these commercial licenses.
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setStep(2)} className="flex-1 text-xs">
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 text-xs">
                {loading ? "Processing..." : "Publish Beat to Queue"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
