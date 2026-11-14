import type { ReactNode } from "react";

export function AdminFilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-sm text-ink">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded border border-border-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel sm:h-10"
      >
        {children}
      </select>
    </label>
  );
}

export function AdminDateFilter({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-sm text-ink">
      <span>{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded border border-border-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel sm:h-10"
      />
    </label>
  );
}
