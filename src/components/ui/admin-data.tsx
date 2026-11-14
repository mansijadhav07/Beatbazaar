import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-status-success-bg text-status-success",
  approved: "bg-status-success-bg text-status-success",
  completed: "bg-status-success-bg text-status-success",
  paid_out: "bg-status-success-bg text-status-success",
  rejected: "bg-status-danger-bg text-status-danger",
  failed: "bg-status-danger-bg text-status-danger",
  disputed: "bg-status-danger-bg text-status-danger",
  in_review: "bg-status-warning-bg text-status-warning",
  needs_more_information: "bg-status-warning-bg text-status-warning",
  pending: "bg-surface-muted text-ink",
  open: "bg-surface-muted text-ink",
  awaiting_kyc: "bg-surface-muted text-ink",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  return (
    <span
      className={cn(
        "inline-flex min-h-6 flex-none items-center whitespace-nowrap rounded px-2 text-xs font-medium capitalize",
        statusStyles[status] || "bg-surface-muted text-ink"
      )}
    >
      {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-steel-dark">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-1 text-sm text-steel-dark">{detail}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded border border-border bg-surface p-6 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-steel-dark">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ToastMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error";
}) {
  const toneClass = {
    neutral: "border-border bg-surface text-ink",
    success: "border-status-success/30 bg-status-success-bg text-status-success",
    error: "border-status-danger/30 bg-status-danger-bg text-status-danger",
  }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded border px-3 py-2 text-sm", toneClass)}
    >
      {children}
    </div>
  );
}
