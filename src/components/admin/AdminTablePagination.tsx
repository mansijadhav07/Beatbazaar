import Link from "next/link";

export function AdminTablePagination({
  pathname,
  page,
  pageSize,
  total,
  filters,
}: {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  filters: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  function href(nextPage: number) {
    const query = new URLSearchParams(filters);
    query.set("page", String(nextPage));
    return `${pathname}?${query.toString()}`;
  }

  return (
    <nav
      aria-label="Table pages"
      className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-steel-dark">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex min-h-11 items-center rounded border border-border-strong px-3 text-sm text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel sm:min-h-10"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded border border-border px-3 text-sm text-steel-dark">
            Previous
          </span>
        )}
        {page < pages ? (
          <Link
            href={href(page + 1)}
            className="inline-flex min-h-11 items-center rounded border border-border-strong px-3 text-sm text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel sm:min-h-10"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded border border-border px-3 text-sm text-steel-dark">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
