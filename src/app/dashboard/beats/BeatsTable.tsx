"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { RefreshCw, Trash2, AlertCircle, CheckCircle2, Clock, Music } from "lucide-react";

interface TrackItem {
  _id: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  status: string;
  processingStatus: string;
  processingError?: string | null;
  createdAt: string;
}

export default function BeatsTable() {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalTrack, setDeleteModalTrack] = useState<TrackItem | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTracks = () => {
    fetch("/api/producer/beats")
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) setTracks(data.tracks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const handleRetry = async (trackId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Retry failed");
      }
      fetchTracks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Retry failed";
      setActionError(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalTrack) return;
    if (deleteConfirmationInput.trim() !== deleteModalTrack.title) {
      setActionError("Confirmation title does not match.");
      return;
    }

    setActionError(null);
    try {
      const res = await fetch(`/api/tracks/${deleteModalTrack._id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setDeleteModalTrack(null);
      setDeleteConfirmationInput("");
      fetchTracks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setActionError(msg);
    }
  };

  if (loading) {
    return <div className="py-8 text-xs text-steel">Loading your beat catalog...</div>;
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-12 text-center bg-surface-muted">
        <Music className="mx-auto h-8 w-8 text-steel mb-3" />
        <h3 className="text-sm font-semibold text-ink">No beats uploaded yet</h3>
        <p className="text-xs text-steel-dark mt-1 max-w-sm mx-auto">
          Upload your first beat master and stems to start selling commercial production licenses.
        </p>
        <Link href="/dashboard/beats/new" className="mt-4 inline-block">
          <Button className="text-xs">Upload New Beat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded border border-status-danger/30 bg-status-danger-bg p-3 text-xs text-status-danger">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="rounded border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Beat</TableHead>
              <TableHead>Genre / BPM</TableHead>
              <TableHead>Processing</TableHead>
              <TableHead>Moderation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks.map((track) => (
              <TableRow key={track._id}>
                <TableCell className="font-medium text-ink">
                  <div>{track.title}</div>
                  <div className="text-[11px] text-steel">
                    Added {new Date(track.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-steel-dark">
                  {track.genre} • {track.bpm} BPM ({track.key})
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                      track.processingStatus === "ready"
                        ? "bg-surface-muted text-ink"
                        : track.processingStatus === "failed"
                        ? "bg-status-danger-bg text-status-danger"
                        : "bg-surface-muted text-brass"
                    }`}
                  >
                    {track.processingStatus === "ready" && <CheckCircle2 className="h-3 w-3 text-brass" />}
                    {track.processingStatus === "failed" && <AlertCircle className="h-3 w-3" />}
                    {(track.processingStatus === "queued" || track.processingStatus === "processing") && (
                      <Clock className="h-3 w-3 animate-spin" />
                    )}
                    <span className="capitalize">{track.processingStatus}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                      track.status === "live"
                        ? "bg-surface-muted text-ink"
                        : track.status === "pending"
                        ? "bg-surface-muted text-steel-dark"
                        : "bg-status-danger-bg text-status-danger"
                    }`}
                  >
                    {track.status}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {track.processingStatus === "failed" && (
                    <Button
                      variant="outline"
                      onClick={() => handleRetry(track._id)}
                      className="h-7 px-2 text-[11px]"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeleteModalTrack(track);
                      setDeleteConfirmationInput("");
                      setActionError(null);
                    }}
                    className="h-7 px-2 text-[11px] text-status-danger hover:text-status-danger"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Named Delete Confirmation Modal */}
      {deleteModalTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded bg-surface p-6 border border-border shadow-md">
            <h3 className="text-sm font-bold text-ink">Delete Beat</h3>
            <p className="mt-2 text-xs text-steel-dark leading-relaxed">
              This action cannot be undone. All audio files and commercial listings for this beat will be permanently purged.
            </p>
            <p className="mt-3 text-xs text-ink font-medium">
              To confirm, type the exact beat title <span className="font-bold underline">{deleteModalTrack.title}</span> below:
            </p>
            <input
              type="text"
              placeholder={deleteModalTrack.title}
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              className="mt-2 w-full rounded border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-status-danger focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalTrack(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmationInput.trim() !== deleteModalTrack.title}
                className="text-xs bg-status-danger hover:bg-status-danger/90 text-surface"
              >
                Delete Beat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

