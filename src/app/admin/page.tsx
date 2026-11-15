import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminQueryForm, AdminFilterSelect } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
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
import { TrackModel } from "@/server/db/models/Track";
import { connectMongoose } from "@/server/db/mongoose";
import { pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

const statuses = ["pending", "live", "rejected", "all"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = queryString(params, "status", 24);
  const status = statuses.includes(requestedStatus as (typeof statuses)[number])
    ? requestedStatus
    : "pending";
  const search = queryString(params, "q", 100);
  const requestedSort = queryString(params, "sort", 16);
  const sort = ["oldest", "title"].includes(requestedSort) ? requestedSort : "newest";
  const page = queryPage(params);
  const limit = pageSize();
  await connectMongoose();

  const filter: Record<string, unknown> = {
    status: status === "all" ? { $in: ["pending", "live", "rejected"] } : status,
  };
  if (search) {
    const escapedSearch = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: escapedSearch }, { producerName: escapedSearch }];
  }
  const [tracks, total, pendingCount, liveCount, rejectedCount] = await Promise.all([
    TrackModel.find(filter)
      .select("title producerName genre bpm status processingStatus rightsConfirmedAt files.kind createdAt")
      .sort(sort === "oldest" ? { createdAt: 1 } : sort === "title" ? { title: 1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TrackModel.countDocuments(filter),
    TrackModel.countDocuments({ status: "pending" }),
    TrackModel.countDocuments({ status: "live" }),
    TrackModel.countDocuments({ status: "rejected" }),
  ]);
  const filters = pageFilters(params, ["status", "q", "sort"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Track moderation</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Review submitted beats. Approval is available only after audio processing is ready.
        </p>
      </div>
      <nav aria-label="Moderation queues" className="flex gap-2 overflow-x-auto pb-1">
        {[
          { href: "/admin", label: "Needs review", value: pendingCount, selected: status === "pending" },
          { href: "/admin?status=live", label: "Live", value: liveCount, selected: status === "live" },
          { href: "/admin?status=rejected", label: "Rejected", value: rejectedCount, selected: status === "rejected" },
          {
            href: "/admin?status=all",
            label: "All beats",
            value: pendingCount + liveCount + rejectedCount,
            selected: status === "all",
          },
        ].map((queue) => (
          <Link
            key={queue.href}
            href={queue.href}
            aria-current={queue.selected ? "page" : undefined}
            className={`flex min-h-[61px] min-w-[132px] flex-1 items-center justify-between gap-3 rounded border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel ${
              queue.selected
                ? "border-steel bg-mist-light text-ink"
                : "border-border bg-surface text-steel-dark hover:bg-surface-muted"
            }`}
          >
            <span className="text-sm">{queue.label}</span>
            <span className="text-base font-semibold tabular-nums">{queue.value}</span>
          </Link>
        ))}
      </nav>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=tracks&q=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`}>
            Export CSV
          </Link>
        </Button>
      </div>
      <AdminQueryForm search={search}>
        <input type="hidden" name="status" value={status} />
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Beat title</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      {tracks.length === 0 ? (
        <EmptyState
          title={search ? "No matching beats" : "No beats in this queue"}
          description={
            search
              ? "Try another title or producer name."
              : "Submitted beats will appear here when they need moderation."
          }
        />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beat</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead className="text-right">BPM</TableHead>
                <TableHead>Processing</TableHead>
                <TableHead>Submitted</TableHead>
                {status === "pending" || status === "all" ? <TableHead>Review</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => {
                const canApprove =
                  track.processingStatus === "ready" &&
                  Boolean(track.rightsConfirmedAt) &&
                  track.files.some((file) => file.kind === "preview");
                return (
                  <TableRow key={track._id.toString()}>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>{track.producerName || "Producer profile"}</TableCell>
                  <TableCell>{track.genre}</TableCell>
                  <TableCell className="text-right tabular-nums">{track.bpm}</TableCell>
                  <TableCell>
                    <StatusBadge status={track.processingStatus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(track.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                  {status === "pending" || status === "all" ? (
                    <TableCell>
                      {track.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          {canApprove ? (
                            <AdminActionDialog
                              label="Approve"
                              title={`Approve ${track.title}?`}
                              consequence={`This will publish the beat on ${siteConfig.name}.`}
                              confirmLabel="Approve beat"
                              targetId={track._id.toString()}
                              action="track_moderate"
                              endpoint={`/api/admin/tracks/${track._id.toString()}`}
                              method="PATCH"
                              payload={{ status: "live", reason: "Approved by administrator" }}
                              successMessage="Beat approved."
                            />
                          ) : (
                            <span className="inline-flex min-h-11 items-center text-sm text-steel-dark">
                              Waiting for audio and rights confirmation
                            </span>
                          )}
                          <AdminActionDialog
                            label="Reject"
                            title={`Reject ${track.title}?`}
                            consequence="This will keep the beat off the public marketplace."
                            confirmLabel="Reject beat"
                            targetId={track._id.toString()}
                            action="track_moderate"
                            endpoint={`/api/admin/tracks/${track._id.toString()}`}
                            method="PATCH"
                            payload={{ status: "rejected", reason: "Rejected by administrator" }}
                            variant="danger"
                            successMessage="Beat rejected."
                          />
                        </div>
                      ) : "No action"}
                    </TableCell>
                  ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <AdminTablePagination
            pathname="/admin"
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
