import type { ReactNode } from "react";

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
    <div className="flex flex-col items-start gap-4 border-y border-border py-8 sm:flex-row sm:items-center sm:gap-8">
      <svg
        aria-hidden="true"
        className="h-14 w-32 flex-none text-steel"
        viewBox="0 0 128 56"
        fill="none"
      >
        <path d="M2 28H126" stroke="currentColor" strokeOpacity=".28" />
        <path
          d="M5 28h7l4-13 6 28 7-34 7 39 7-28 7 14 7-23 7 34 7-23 7 15 7-20 7 27 7-24 7 17 7-11 7 13 7-15 7 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-steel-dark">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
