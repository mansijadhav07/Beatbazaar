"use client";

import { useState, type FormEvent } from "react";

interface ReportableTrack {
  id: string;
  title: string;
}

export function CopyrightReportForm({ tracks }: { tracks: ReportableTrack[] }) {
  const [trackId, setTrackId] = useState(tracks[0]?.id || "");
  const [category, setCategory] = useState("copyright");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackId, category, details }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Report submission failed.");
      setMessage("Report submitted for review.");
      setDetails("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (tracks.length === 0) {
    return (
      <p className="bg-surface-muted p-5 text-base text-ink">
        There are no live beats to report right now.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <label className="flex flex-col gap-2 text-base font-medium text-ink">
        Beat
        <select
          required
          value={trackId}
          onChange={(event) => setTrackId(event.target.value)}
          className="min-h-11 border border-border-strong bg-surface px-3 text-base"
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>{track.title}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-medium text-ink">
        Reason
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-11 border border-border-strong bg-surface px-3 text-base"
        >
          <option value="copyright">Copyright or rights concern</option>
          <option value="misleading_metadata">Misleading beat information</option>
          <option value="audio_quality">Audio quality</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="flex flex-col gap-2 text-base font-medium text-ink">
        Details
        <textarea
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="border border-border-strong bg-surface px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel"
        />
      </label>
      {message && <p role="status" className="text-base text-ink">{message}</p>}
      <button
        type="submit"
        disabled={busy || details.trim().length < 10}
        className="min-h-11 bg-ink px-4 font-semibold text-white hover:bg-ink-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting report" : "Submit report"}
      </button>
    </form>
  );
}
