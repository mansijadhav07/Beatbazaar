import { siteConfig } from "@/config/site";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-display text-lg font-black tracking-tight text-ink ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-8 w-8 shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="var(--brass)" />
        <path
          d="M7.5 23 16 7l8.5 16M11.5 18.5h9"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />
      </svg>
      <span>{siteConfig.name}</span>
    </span>
  );
}
