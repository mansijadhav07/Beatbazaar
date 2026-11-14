"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Upload, Music, DollarSign, ShieldCheck } from "lucide-react";

type LicenseFile = "mp3" | "wav" | "stems";

function parseRupeesToPaise(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const rupees = Number(match[1]);
  const paise = Number((match[2] || "").padEnd(2, "0"));
  const amount = rupees * 100 + paise;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export default function UploadBeatWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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
  const [freeLicenseEnabled, setFreeLicenseEnabled] = useState(false);
  const [freeTermsText, setFreeTermsText] = useState("");
  const [nonExclusivePrice, setNonExclusivePrice] = useState("");
  const [exclusivePrice, setExclusivePrice] = useState("");
  const [freeIncludedFiles, setFreeIncludedFiles] = useState<LicenseFile[]>(["mp3"]);
  const [nonExclusiveIncludedFiles, setNonExclusiveIncludedFiles] = useState<LicenseFile[]>(["mp3"]);
  const [exclusiveIncludedFiles, setExclusiveIncludedFiles] = useState<LicenseFile[]>(["mp3"]);
  const [nonExclusiveTermsText, setNonExclusiveTermsText] = useState("");
  const [exclusiveTermsText, setExclusiveTermsText] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressText, setProgressText] = useState("");
  const availableLicenseFiles: Array<{ kind: LicenseFile; label: string }> = [
    { kind: "mp3", label: "MP3" },
    ...(wavFile ? [{ kind: "wav" as const, label: "WAV" }] : []),
    ...(stemsFile ? [{ kind: "stems" as const, label: "Stems archive" }] : []),
  ];

  const renderFileChoices = (
    selectedFiles: LicenseFile[],
    setSelectedFiles: Dispatch<SetStateAction<LicenseFile[]>>
  ) => (
    <fieldset className="mt-3">
      <legend className="text-sm font-semibold text-ink">Included files</legend>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {availableLicenseFiles.map(({ kind, label }) => (
          <label key={kind} className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={selectedFiles.includes(kind)}
              onChange={(event) => {
                setSelectedFiles((current) =>
                  event.target.checked
                    ? [...current, kind]
                    : current.filter((file) => file !== kind)
                );
              }}
              className="h-4 w-4 rounded border-border text-brass focus:ring-brass"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );

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

  const handleNextFromStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    const availableKinds = new Set(availableLicenseFiles.map((file) => file.kind));
    const hasAvailableFile = (files: LicenseFile[]) =>
      files.some((file) => availableKinds.has(file));
    if (!rightsConfirmed) {
      setErrorMsg("Confirm that you have the rights required to offer this beat.");
      return;
    }
    if (
      parseRupeesToPaise(nonExclusivePrice) === null ||
      parseRupeesToPaise(exclusivePrice) === null
    ) {
      setErrorMsg("Enter a valid INR price for each paid license.");
      return;
    }
    if (
      (freeLicenseEnabled && !hasAvailableFile(freeIncludedFiles)) ||
      !hasAvailableFile(nonExclusiveIncludedFiles) ||
      !hasAvailableFile(exclusiveIncludedFiles) ||
      !nonExclusiveTermsText.trim() ||
      !exclusiveTermsText.trim() ||
      (freeLicenseEnabled && !freeTermsText.trim())
    ) {
      setErrorMsg("Choose at least one included file and provide terms for each enabled license.");
      return;
    }
    setErrorMsg(null);
    setStep(4);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rightsConfirmed) {
      setErrorMsg("Confirm that you have the rights required to offer this beat.");
      return;
    }
    const nonExclusiveAmount = parseRupeesToPaise(nonExclusivePrice);
    const exclusiveAmount = parseRupeesToPaise(exclusivePrice);
    if (nonExclusiveAmount === null || exclusiveAmount === null) {
      setErrorMsg("Enter a valid INR price for each paid license.");
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
            ...(freeLicenseEnabled
              ? [{
                  tier: "free",
                  name: "Free License",
                  price: { amount: 0, currency: "INR" },
                  includedFiles: freeIncludedFiles.filter((file) =>
                    availableLicenseFiles.some((available) => available.kind === file)
                  ),
                  termsText: freeTermsText.trim(),
                  termsVersion: "1.0",
                  enabled: true,
                }]
              : []),
            {
              tier: "non_exclusive",
              name: "Non-Exclusive License",
              price: { amount: nonExclusiveAmount, currency: "INR" },
              includedFiles: nonExclusiveIncludedFiles.filter((file) =>
                availableLicenseFiles.some((available) => available.kind === file)
              ),
              termsText: nonExclusiveTermsText.trim(),
              termsVersion: "1.0",
              enabled: true,
            },
            {
              tier: "exclusive",
              name: "Exclusive License",
              price: { amount: exclusiveAmount, currency: "INR" },
              includedFiles: exclusiveIncludedFiles.filter((file) =>
                availableLicenseFiles.some((available) => available.kind === file)
              ),
              termsText: exclusiveTermsText.trim(),
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
          <div className="h-px w-6 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 2 ? "bg-ink text-surface" : "bg-surface-muted text-steel"
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-ink">Audio</span>
          </div>
          <div className="h-px w-6 bg-border" />
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
          <div className="h-px w-6 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === 4 ? "bg-ink text-surface" : "bg-surface-muted text-steel"
              }`}
            >
              4
            </span>
            <span className="text-xs font-medium text-ink">Review</span>
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

        {/* Step 3: Licenses */}
        {step === 3 && (
          <form onSubmit={handleNextFromStep3} className="space-y-4">
            <p className="text-sm leading-relaxed text-steel">
              Set the available license options, included files, prices in INR, and your terms.
              License terms are producer-provided and should receive legal review before publishing.
            </p>
            <div className="space-y-3">
              <div className="rounded border border-border p-3">
                <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={freeLicenseEnabled}
                    onChange={(event) => setFreeLicenseEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-brass focus:ring-brass"
                  />
                  Offer a free license
                </label>
                {freeLicenseEnabled && (
                  <div className="mt-3 border-t border-border pt-3">
                    {renderFileChoices(freeIncludedFiles, setFreeIncludedFiles)}
                    <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="free-terms">
                      Free license terms
                    </label>
                    <textarea
                      id="free-terms"
                      required
                      maxLength={5000}
                      value={freeTermsText}
                      onChange={(event) => setFreeTermsText(event.target.value)}
                      className="mt-1 min-h-24 w-full rounded border border-border bg-surface px-3 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                    />
                  </div>
                )}
              </div>

              <div className="rounded border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="non-exclusive-price" className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-steel" />
                    Non-Exclusive License
                  </label>
                  <span className="text-sm text-steel">INR</span>
                </div>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  id="non-exclusive-price"
                  value={nonExclusivePrice}
                  onChange={(e) => setNonExclusivePrice(e.target.value)}
                  className="text-base"
                />
                {renderFileChoices(nonExclusiveIncludedFiles, setNonExclusiveIncludedFiles)}
                <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="non-exclusive-terms">
                  Non-exclusive license terms
                </label>
                <textarea
                  id="non-exclusive-terms"
                  required
                  maxLength={5000}
                  value={nonExclusiveTermsText}
                  onChange={(event) => setNonExclusiveTermsText(event.target.value)}
                  className="mt-1 min-h-24 w-full rounded border border-border bg-surface px-3 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                />
              </div>

              <div className="rounded border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="exclusive-price" className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-steel" />
                    Exclusive License
                  </label>
                  <span className="text-sm text-steel">INR</span>
                </div>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  id="exclusive-price"
                  value={exclusivePrice}
                  onChange={(e) => setExclusivePrice(e.target.value)}
                  className="text-base"
                />
                {renderFileChoices(exclusiveIncludedFiles, setExclusiveIncludedFiles)}
                <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="exclusive-terms">
                  Exclusive license terms
                </label>
                <textarea
                  id="exclusive-terms"
                  required
                  maxLength={5000}
                  value={exclusiveTermsText}
                  onChange={(event) => setExclusiveTermsText(event.target.value)}
                  className="mt-1 min-h-24 w-full rounded border border-border bg-surface px-3 py-2 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
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
                  I confirm that I own or have obtained the rights needed to offer this beat and that any samples have been cleared.
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setStep(2)} className="flex-1 text-xs">
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 text-xs">
                Continue to Review
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Review and Submit */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="rounded border border-border p-3 bg-surface-muted">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">Beat Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-steel">Title:</span> <span className="font-medium text-ink">{title}</span>
                  </div>
                  <div>
                    <span className="text-steel">Genre:</span> <span className="font-medium text-ink">{genre}</span>
                  </div>
                  <div>
                    <span className="text-steel">Tempo:</span> <span className="font-medium text-ink">{bpm} BPM</span>
                  </div>
                  <div>
                    <span className="text-steel">Key:</span> <span className="font-medium text-ink">{key}</span>
                  </div>
                </div>
              </div>

              <div className="rounded border border-border p-3 bg-surface-muted">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">Attached Files</h4>
                <div className="space-y-1 text-xs text-ink">
                  <div>
                    <span className="text-steel">MP3 Master:</span> {mp3File?.name} ({(mp3File?.size ? mp3File.size / (1024 * 1024) : 0).toFixed(1)} MB)
                  </div>
                  {wavFile && (
                    <div>
                      <span className="text-steel">WAV Master:</span> {wavFile.name} ({(wavFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}
                  {stemsFile && (
                    <div>
                      <span className="text-steel">Track Stems:</span> {stemsFile.name} ({(stemsFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  )}
                  {coverFile && (
                    <div>
                      <span className="text-steel">Artwork:</span> {coverFile.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded border border-border p-3 bg-surface-muted">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">License Pricing</h4>
                <div className="space-y-1 text-xs text-ink">
                  {freeLicenseEnabled && (
                    <div>
                      <span className="text-steel">Free License:</span> Free
                    </div>
                  )}
                  <div>
                    <span className="text-steel">Non-Exclusive License:</span>{" "}
                    ₹{Number(nonExclusivePrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div>
                    <span className="text-steel">Exclusive License:</span>{" "}
                    ₹{Number(exclusivePrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="text-xs text-steel leading-relaxed">
                Submitting places your beat into the processing queue. After audio watermarking and waveform extraction, it will be marked as pending review by our curation team before going live.
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setStep(3)} className="flex-1 text-xs">
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 text-xs">
                {loading ? "Processing..." : "Submit for review"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
