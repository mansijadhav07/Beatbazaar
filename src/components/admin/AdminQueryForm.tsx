import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AdminDateFilter, AdminFilterSelect } from "@/components/ui/admin-filters";
import { Input } from "@/components/ui/input";

export function AdminQueryForm({
  children,
  search,
  from,
  to,
}: {
  children?: ReactNode;
  search?: string;
  from?: string;
  to?: string;
}) {
  return (
    <form
      method="get"
      className="flex flex-col gap-3 rounded border border-border bg-surface p-4 md:flex-row md:flex-wrap md:items-end"
    >
      {search !== undefined ? (
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-ink">
          <span>Search</span>
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search records"
            className="placeholder:text-steel-dark"
          />
        </label>
      ) : null}
      {children}
      {from !== undefined ? <AdminDateFilter label="From" name="from" defaultValue={from} /> : null}
      {to !== undefined ? <AdminDateFilter label="To" name="to" defaultValue={to} /> : null}
      <Button type="submit" variant="outline">
        Apply filters
      </Button>
    </form>
  );
}

export { AdminFilterSelect };
