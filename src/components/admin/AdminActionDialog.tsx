"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToastMessage } from "@/components/ui/admin-data";

interface AdminActionDialogProps {
  label: string;
  title: string;
  consequence: string;
  confirmLabel: string;
  targetId: string;
  action: "track_moderate" | "track_feature" | "report_update" | "order_refund";
  endpoint: string;
  method: "PATCH" | "POST";
  payload: Record<string, string | boolean>;
  variant?: "default" | "outline" | "danger";
  successMessage: string;
}

export function AdminActionDialog({
  label,
  title,
  consequence,
  confirmLabel,
  targetId,
  action,
  endpoint,
  method,
  payload,
  variant = "outline",
  successMessage,
}: AdminActionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");

    try {
      const stepUpResponse = await fetch("/api/admin/step-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, action, targetId }),
      });
      if (!stepUpResponse.ok) {
        const result = (await stepUpResponse.json()) as { error?: string };
        throw new Error(result.error || "Could not verify your password.");
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "The administrator action failed.");
      }

      setOpen(false);
      setPassword("");
      setCompleted(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action failed.");
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
          if (!nextOpen) {
            setPassword("");
            setError("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant={variant}>
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
          <div className="mt-5 space-y-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              <span>Confirm with your password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded border border-border-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel sm:h-10"
              />
            </label>
            {error ? <ToastMessage tone="error">{error}</ToastMessage> : null}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={variant === "danger" ? "danger" : "default"}
                onClick={submit}
                disabled={busy || !password}
              >
                {busy ? "Confirming..." : confirmLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {completed ? (
        <div className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm">
          <ToastMessage tone="success">{successMessage}</ToastMessage>
        </div>
      ) : null}
    </>
  );
}
