import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminFilterSelect, AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { AdminTabs } from "@/components/ui/tabs";
import { EmptyState, StatusBadge } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import { TrackModel } from "@/server/db/models/Track";
import { connectMongoose } from "@/server/db/mongoose";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const search = queryString(params, "q", 100);
  const requestedFeatured = queryString(params, "featured", 8);
  const featured = requestedFeatured === "false" ? "false" : "true";
  const requestedSort = queryString(params, "sort", 16);
  const sort = requestedSort === "plays" ? "plays" : "recent";
  const page = queryPage(params);
  const limit = pageSize();
  await connectMongoose();
  const filter: Record<string, unknown> = {
    status: "live",
    featured: featured === "true",
  };
  if (search) {
    const literal = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: literal }, { producerName: literal }];
  }
  const [tracks, total] = await Promise.all([
    TrackModel.find(filter)
      .select("title producerName genre playCount featured updatedAt")
      .sort(sort === "plays" ? { playCount: -1, updatedAt: -1 } : { updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TrackModel.countDocuments(filter),
  ]);
  const filters = pageFilters(params, ["q", "featured", "sort"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Featured beats</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Only live beats can be featured. Feature status is stored on the beat record.
        </p>
      </div>
      <AdminTabs
        label="Featured selection"
        items={[
          { href: "/admin/featured?featured=true", label: "Featured", current: featured === "true" },
          { href: "/admin/featured?featured=false", label: "Not featured", current: featured === "false" },
        ]}
      />
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=tracks&featured=${featured}&q=${encodeURIComponent(search)}`}>
            Export CSV
          </Link>
        </Button>
      </div>
      <AdminQueryForm search={search}>
        <input type="hidden" name="featured" value={featured} />
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="recent">Recently updated</option>
          <option value="plays">Recorded plays</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      {tracks.length === 0 ? (
        <EmptyState
          title={search ? "No matching live beats" : "No beats in this view"}
          description="Only approved, live beats can be selected as featured content."
        />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beat</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead className="text-right">Recorded plays</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track._id.toString()}>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>{track.producerName || "Producer profile"}</TableCell>
                  <TableCell>{track.genre}</TableCell>
                  <TableCell className="text-right tabular-nums">{track.playCount}</TableCell>
                  <TableCell><StatusBadge status={track.featured ? "active" : "pending"} /></TableCell>
                  <TableCell>
                    <AdminActionDialog
                      label={track.featured ? "Remove feature" : "Feature beat"}
                      title={`${track.featured ? "Remove" : "Feature"} ${track.title}?`}
                      consequence={
                        track.featured
                          ? "This will remove the beat from featured placements."
                          : "This will allow the beat to appear in featured placements."
                      }
                      confirmLabel={track.featured ? "Remove feature" : "Feature beat"}
                      targetId={track._id.toString()}
                      action="track_feature"
                      endpoint={`/api/admin/tracks/${track._id.toString()}/featured`}
                      method="PATCH"
                      payload={{ featured: !track.featured }}
                      variant={track.featured ? "danger" : "default"}
                      successMessage={track.featured ? "Beat removed from featured placements." : "Beat featured."}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination
            pathname="/admin/featured"
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
