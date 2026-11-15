import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded border border-border bg-surface px-3 text-sm text-ink",
        className
      )}
      {...props}
    />
  );
}
