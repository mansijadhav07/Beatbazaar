import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminFilterSelect, AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { EmptyState, StatusBadge } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escapeRegex, pageFilters, pageSize, queryPage, queryString, validDateParam, type AdminSearchParams } from "@/lib/admin-query";
import { OrderModel } from "@/server/db/models/Order";
import { connectMongoose } from "@/server/db/mongoose";
import Link from "next/link";

export const dynamic = "force-dynamic";
const orderStatuses = ["pending", "paid", "failed", "refunded"] as const;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount / 100);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const requestedStatus = queryString(params, "status", 16);
  const status = orderStatuses.includes(requestedStatus as (typeof orderStatuses)[number]) ? requestedStatus : "all";
  const requestedSort = queryString(params, "sort", 16);
  const sort = ["oldest", "total_high", "total_low"].includes(requestedSort) ? requestedSort : "newest";
  const search = queryString(params, "q", 100);
  const from = queryString(params, "from", 10);
  const to = queryString(params, "to", 10);
  const fromDate = validDateParam(from);
  const toDate = validDateParam(to);
  const page = queryPage(params);
  const limit = pageSize();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  if (search) {
    const literal = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ buyerEmail: literal }, { paymentRef: literal }];
    if (/^[a-f\d]{24}$/i.test(search)) filter._id = search;
  }
  if (fromDate || toDate) {
    const createdAt: Record<string, Date> = {};
    if (fromDate) createdAt.$gte = fromDate;
    if (toDate) {
      const exclusiveEnd = new Date(toDate);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      createdAt.$lt = exclusiveEnd;
    }
    filter.createdAt = createdAt;
  }
  await connectMongoose();
  const [orders, total] = await Promise.all([
    OrderModel.find(filter)
      .select("buyerEmail status currency totalAmount paymentRef createdAt items")
      .sort(
        sort === "oldest"
          ? { createdAt: 1 }
          : sort === "total_high"
            ? { totalAmount: -1, createdAt: -1 }
            : sort === "total_low"
              ? { totalAmount: 1, createdAt: -1 }
              : { createdAt: -1 }
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);
  const filters = pageFilters(params, ["status", "from", "to", "sort", "q"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Orders and refunds</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          Review payment records and initiate refunds. A fresh password confirmation is required for every refund.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/api/admin/export?type=orders&${new URLSearchParams(filters).toString()}`}>Export CSV</Link>
        </Button>
      </div>
      <AdminQueryForm search={search} from={from} to={to}>
        <AdminFilterSelect label="Order status" name="status" defaultValue={status}>
          <option value="all">All statuses</option>
          {orderStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </AdminFilterSelect>
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="total_high">Highest total</option>
          <option value="total_low">Lowest total</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      {orders.length === 0 ? (
        <EmptyState title="No matching orders" description="Orders will appear here after checkout records are created." />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment reference</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const orderId = order._id.toString();
                return (
                  <TableRow key={orderId}>
                    <TableCell className="text-xs tabular-nums">{orderId}</TableCell>
                    <TableCell>{order.buyerEmail}</TableCell>
                    <TableCell>{order.items.map((item) => item.title).join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatAmount(order.totalAmount, order.currency)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{order.paymentRef || "Not recorded"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell>
                      {order.status === "paid" ? (
                        <AdminActionDialog
                          label="Refund"
                          title={`Refund order ${orderId}?`}
                          consequence={`This will refund ${formatAmount(order.totalAmount, order.currency)}, revoke downloads, and update the producer ledger.`}
                          confirmLabel="Refund order"
                          targetId={orderId}
                          action="order_refund"
                          endpoint={`/api/admin/orders/${orderId}/refund`}
                          method="POST"
                          payload={{ reason: "Admin initiated refund" }}
                          variant="danger"
                          successMessage="Refund request submitted."
                        />
                      ) : "No action"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <AdminTablePagination pathname="/admin/orders" page={page} pageSize={limit} total={total} filters={filters} />
        </div>
      )}
    </div>
  );
}
