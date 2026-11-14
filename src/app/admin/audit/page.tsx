import { AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { EmptyState } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import { validDateParam } from "@/lib/admin-query";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { connectMongoose } from "@/server/db/mongoose";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const action = queryString(params, "action", 80);
  const from = queryString(params, "from", 10);
  const to = queryString(params, "to", 10);
  const requestedSort = queryString(params, "sort", 16);
  const sort = requestedSort === "oldest" ? "oldest" : "newest";
  const page = queryPage(params);
  const limit = pageSize();
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  const fromDate = validDateParam(from);
  const toDate = validDateParam(to);
  if (fromDate || toDate) {
    const timestamp: Record<string, Date> = {};
    if (fromDate) timestamp.$gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCDate(end.getUTCDate() + 1);
      timestamp.$lt = end;
    }
    filter.timestamp = timestamp;
  }
  await connectMongoose();
  const [entries, total] = await Promise.all([
    AuditLogModel.find(filter)
      .select("actorId actorRole action targetCollection targetId before after timestamp")
      .sort({ timestamp: sort === "oldest" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);
  const filters = pageFilters(params, ["action", "from", "to", "sort"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Audit log</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Administrator changes are recorded with their before and after state.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=audit&${new URLSearchParams(filters).toString()}`}>Export CSV</Link>
        </Button>
      </div>
      <AdminQueryForm from={from} to={to}>
        <label className="flex min-w-48 flex-col gap-1 text-sm text-ink">
          <span>Action</span>
          <input
            name="action"
            defaultValue={action}
            placeholder="Filter by action"
            className="h-11 rounded border border-border-strong bg-surface px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
          />
        </label>
        <label className="flex min-w-36 flex-col gap-1 text-sm text-ink">
          <span>Sort by</span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-11 rounded border border-border-strong bg-surface px-3 text-base text-ink"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </AdminQueryForm>
      {entries.length === 0 ? (
        <EmptyState title="No audit entries" description="Administrator actions will be recorded here." />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Administrator</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry._id.toString()}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>{entry.actorId} ({entry.actorRole})</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.targetCollection} / {entry.targetId}</TableCell>
                  <TableCell className="max-w-56 whitespace-normal text-xs">
                    {entry.before ? JSON.stringify(entry.before) : "Not recorded"}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal text-xs">
                    {entry.after ? JSON.stringify(entry.after) : "Not recorded"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination pathname="/admin/audit" page={page} pageSize={limit} total={total} filters={filters} />
        </div>
      )}
    </div>
  );
}
