import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded border border-border bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

export { Select };
