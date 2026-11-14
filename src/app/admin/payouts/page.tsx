import { AdminFilterSelect, AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { EmptyState, StatusBadge } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escapeRegex, pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";
import { connectMongoose } from "@/server/db/mongoose";
import Link from "next/link";

export const dynamic = "force-dynamic";
const payoutStatuses = ["awaiting_kyc", "awaiting_account_cooling", "awaiting_fee_data", "creating", "pending_hold", "awaiting_settlement", "paid_out", "reversed", "disputed", "failed"] as const;

function formatRupees(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount / 100);
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = queryString(params, "status", 32);
  const status = payoutStatuses.includes(requestedStatus as (typeof payoutStatuses)[number]) ? requestedStatus : "all";
  const requestedSort = queryString(params, "sort", 16);
  const sort = ["oldest", "release_date"].includes(requestedSort) ? requestedSort : "newest";
  const search = queryString(params, "q", 100);
  const page = queryPage(params);
  const limit = pageSize();
  await connectMongoose();
  const filter: Record<string, unknown> = status === "all" ? {} : { status };
  if (search) {
    const literal = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { producerId: literal },
      { orderId: literal },
      { trackTitle: literal },
      { providerTransferId: literal },
    ];
  }
  const [transfers, total] = await Promise.all([
    PayoutTransferModel.find(filter)
      .select("producerId orderId orderItemIdx trackTitle grossAmount platformFeeAmount gatewayFeeAmount netAmount status holdReleaseAt providerTransferId disputeStatus createdAt")
      .sort(sort === "oldest" ? { createdAt: 1 } : sort === "release_date" ? { holdReleaseAt: 1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PayoutTransferModel.countDocuments(filter),
  ]);
  const filters = pageFilters(params, ["status", "sort", "q"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Payout transfers</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Provider-backed transfers and their current ledger status. This page does not initiate payouts.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=payouts&${new URLSearchParams(filters).toString()}`}>Export CSV</Link>
        </Button>
      </div>
      <AdminQueryForm search={search}>
        <AdminFilterSelect label="Transfer status" name="status" defaultValue={status}>
          <option value="all">All statuses</option>
          {payoutStatuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </AdminFilterSelect>
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="release_date">Next release date</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      {transfers.length === 0 ? (
        <EmptyState title="No payout transfers" description="Verified paid orders will create transfer ledger entries when eligible." />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beat</TableHead>
                <TableHead>Producer</TableHead>
                <TableHead>Order item</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Platform fee</TableHead>
                <TableHead className="text-right">Gateway fee</TableHead>
                <TableHead className="text-right">Producer net</TableHead>
                <TableHead>Release date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider transfer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={`${transfer.orderId}-${transfer.orderItemIdx}`}>
                  <TableCell>{transfer.trackTitle}</TableCell>
                  <TableCell className="text-xs tabular-nums">{transfer.producerId}</TableCell>
                  <TableCell className="text-xs tabular-nums">{transfer.orderId} / {transfer.orderItemIdx + 1}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupees(transfer.grossAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupees(transfer.platformFeeAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{transfer.gatewayFeeAmount === undefined ? "Not recorded" : formatRupees(transfer.gatewayFeeAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{transfer.netAmount === undefined ? "Not recorded" : formatRupees(transfer.netAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(transfer.holdReleaseAt).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell><StatusBadge status={transfer.status} /></TableCell>
                  <TableCell className="text-xs tabular-nums">{transfer.providerTransferId || "Not created"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminTablePagination pathname="/admin/payouts" page={page} pageSize={limit} total={total} filters={filters} />
        </div>
      )}
    </div>
  );
}
