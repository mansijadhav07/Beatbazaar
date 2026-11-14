"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToastMessage } from "@/components/ui/admin-data";

export function ReportBeatDialog({
  trackId,
  trackTitle,
}: {
  trackId: string;
  trackTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("copyright");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
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
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Report submission failed.");
      }
      setIsError(false);
      setMessage("Report submitted for review.");
      setDetails("");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Report submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setMessage("");
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            Report this beat
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Report {trackTitle}</DialogTitle>
          <DialogDescription>
            Send a factual report to the moderation team. You need to be signed in.
          </DialogDescription>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              <span>Reason</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 rounded border border-border-strong bg-surface px-3 text-base"
              >
                <option value="copyright">Copyright or rights concern</option>
                <option value="audio_quality">Audio quality</option>
                <option value="misleading_metadata">Misleading beat information</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              <span>Details</span>
              <textarea
                required
                minLength={10}
                maxLength={3000}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={5}
                className="rounded border border-border-strong bg-surface px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
              />
            </label>
            {message ? (
              <ToastMessage tone={isError ? "error" : "success"}>{message}</ToastMessage>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={busy || details.trim().length < 10}>
                {busy ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
