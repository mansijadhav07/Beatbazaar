import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "neutral" | "success" | "error";

const toneStyles: Record<ToastTone, string> = {
  neutral: "border-border bg-surface text-ink",
  success: "border-status-success/30 bg-status-success-bg text-status-success",
  error: "border-status-danger/30 bg-status-danger-bg text-status-danger",
};

export function Toast({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: ToastTone;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("toast-enter rounded border px-3 py-2 text-sm", toneStyles[tone], className)}
    >
      {children}
    </div>
  );
}
