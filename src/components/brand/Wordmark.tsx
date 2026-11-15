import { siteConfig } from "@/config/site";

export function Wordmark() {
  return (
    <svg
      role="img"
      aria-label={siteConfig.name}
      viewBox="0 0 190 36"
      className="h-8 w-[10.6rem] text-ink"
    >
      <title>{siteConfig.name}</title>
      <text
        x="0"
        y="27"
        fill="currentColor"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="25"
        fontWeight="650"
        letterSpacing="-0.6"
      >
        {siteConfig.name}
      </text>
    </svg>
  );
}
