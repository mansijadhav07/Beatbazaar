import type { ReactNode } from "react";

interface SupportArticleProps {
  title: string;
  intro: string;
  children: ReactNode;
  legalReview?: boolean;
}

export function SupportArticle({
  title,
  intro,
  children,
  legalReview = false,
}: SupportArticleProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-4">
        <h1 className="font-display text-[1.75rem] font-black leading-[1.12] tracking-[-0.04em] text-ink sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="text-base leading-7 text-steel-dark">{intro}</p>
        {legalReview && (
          <>
            <p
              role="note"
              className="bg-surface-muted px-4 py-3 text-sm font-medium leading-6 text-ink"
            >
              LEGAL REVIEW REQUIRED. This draft is not a final policy. Do not rely
              on it as legal advice or enable live payments until it is approved.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <p className="border-l-4 border-status-warning bg-status-warning-bg px-4 py-3 text-sm font-medium text-ink">
                Draft page. This content is not approved for production use.
              </p>
            )}
          </>
        )}
      </header>
      <div className="mt-10 space-y-8 text-base leading-7 text-ink">{children}</div>
    </article>
  );
}

export function SupportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={title.toLowerCase().replaceAll(" ", "-")}>
      <h2
        id={title.toLowerCase().replaceAll(" ", "-")}
        className="mb-3 font-display text-lg font-black leading-7 text-ink"
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
