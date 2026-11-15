import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState as EmptyStateUI } from "@/components/ui/empty-state";
import { Toast } from "@/components/ui/toast";

const statusVariants: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  active: "success",
  approved: "success",
  completed: "success",
  paid_out: "success",
  rejected: "danger",
  failed: "danger",
  disputed: "danger",
  in_review: "warning",
  needs_more_information: "warning",
  pending: "neutral",
  open: "neutral",
  awaiting_kyc: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");
  const variant = statusVariants[status] || "neutral";
  return <Badge variant={variant}>{label}</Badge>;
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
    <EmptyStateUI title={title} description={description} action={action} />
  );
}

export function ToastMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error";
}) {
  return <Toast tone={tone}>{children}</Toast>;
}
