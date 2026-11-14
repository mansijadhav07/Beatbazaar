import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminFilterSelect, AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { AdminTabs } from "@/components/ui/tabs";
import { EmptyState, StatusBadge } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { escapeRegex, pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import { ReportModel } from "@/server/db/models/Report";
import { connectMongoose } from "@/server/db/mongoose";
import Link from "next/link";

export const dynamic = "force-dynamic";
const reportStatuses = ["open", "in_review", "resolved", "dismissed", "all"] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = queryString(params, "status", 24);
  const status = reportStatuses.includes(requestedStatus as (typeof reportStatuses)[number])
    ? requestedStatus
    : "open";
  const requestedSort = queryString(params, "sort", 16);
  const sort = requestedSort === "oldest" ? "oldest" : "newest";
  const search = queryString(params, "q", 100);
  const page = queryPage(params);
  const limit = pageSize();
  await connectMongoose();
  const filter: Record<string, unknown> = status === "all" ? {} : { status };
  if (search) {
    const literal = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ trackTitle: literal }, { reporterEmail: literal }];
  }
  const [reports, total] = await Promise.all([
    ReportModel.find(filter)
      .sort({ createdAt: sort === "oldest" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ReportModel.countDocuments(filter),
  ]);
  const filters = pageFilters(params, ["status", "sort", "q"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Reports and takedowns</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Review user-submitted reports and record the disposition. Reporter contact details are
          restricted to administrators.
        </p>
      </div>
      <AdminTabs
        label="Report status"
        items={[
          { href: "/admin/reports", label: "Open", current: status === "open" },
          { href: "/admin/reports?status=in_review", label: "In review", current: status === "in_review" },
          { href: "/admin/reports?status=resolved", label: "Resolved", current: status === "resolved" },
          { href: "/admin/reports?status=dismissed", label: "Dismissed", current: status === "dismissed" },
          { href: "/admin/reports?status=all", label: "All", current: status === "all" },
        ]}
      />
      <AdminQueryForm search={search}>
        <input type="hidden" name="status" value={status} />
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=reports&status=${encodeURIComponent(status)}&q=${encodeURIComponent(search)}`}>
            Export CSV
          </Link>
        </Button>
      </div>
      {reports.length === 0 ? (
        <EmptyState
          title="No reports in this view"
          description="Reports submitted by signed-in users will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beat</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id.toString()}>
                  <TableCell className="min-w-40 font-medium">{report.trackTitle}</TableCell>
                  <TableCell className="capitalize">{report.category.replaceAll("_", " ")}</TableCell>
                  <TableCell>{report.reporterEmail}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(report.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell><StatusBadge status={report.status} /></TableCell>
                  <TableCell className="max-w-64 whitespace-normal">{report.details}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {report.status === "open" ? (
                        <AdminActionDialog
                          label="Start review"
                          title="Move report to review?"
                          consequence={`The report for ${report.trackTitle} will be marked in review.`}
                          confirmLabel="Start review"
                          targetId={report._id.toString()}
                          action="report_update"
                          endpoint={`/api/admin/reports/${report._id.toString()}`}
                          method="PATCH"
                          payload={{ status: "in_review", adminNote: "Review started" }}
                          successMessage="Report moved to review."
                        />
                      ) : null}
                      {report.status === "open" || report.status === "in_review" ? (
                        <>
                          <AdminActionDialog
                            label="Take down beat"
                            title={`Take down ${report.trackTitle}?`}
                            consequence="This will remove the beat from public listings and resolve the report. Existing orders and licenses are not changed."
                            confirmLabel="Take down beat"
                            targetId={report._id.toString()}
                            action="report_update"
                            endpoint={`/api/admin/reports/${report._id.toString()}`}
                            method="PATCH"
                            payload={{
                              status: "resolved",
                              adminNote: "Beat removed after rights or listing review",
                              takeDown: true,
                            }}
                            variant="danger"
                            successMessage="Beat removed and report resolved."
                          />
                          <AdminActionDialog
                            label="Resolve"
                            title="Resolve this report?"
                            consequence={`This will mark the report for ${report.trackTitle} as resolved.`}
                            confirmLabel="Resolve report"
                            targetId={report._id.toString()}
                            action="report_update"
                            endpoint={`/api/admin/reports/${report._id.toString()}`}
                            method="PATCH"
                            payload={{ status: "resolved", adminNote: "Resolved by administrator" }}
                            successMessage="Report resolved."
                          />
                          <AdminActionDialog
                            label="Dismiss"
                            title="Dismiss this report?"
                            consequence={`This will mark the report for ${report.trackTitle} as dismissed.`}
                            confirmLabel="Dismiss report"
                            targetId={report._id.toString()}
                            action="report_update"
                            endpoint={`/api/admin/reports/${report._id.toString()}`}
                            method="PATCH"
                            payload={{ status: "dismissed", adminNote: "Dismissed by administrator" }}
                            variant="danger"
                            successMessage="Report dismissed."
                          />
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            pathname="/admin/reports"
            page={page}
            pageSize={limit}
            total={total}
            filters={filters}
          />
        </div>
      )}
    </div>
  );
}
