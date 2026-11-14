import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const allowedStatuses = new Set([
  "awaiting_kyc",
  "awaiting_fee_data",
  "pending_hold",
  "awaiting_settlement",
  "paid_out",
  "reversed",
  "disputed",
  "failed",
]);

function safeDate(value: string | null, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case "pending_hold":
      return "Pending hold";
    case "awaiting_kyc":
      return "Awaiting payout setup";
    case "awaiting_fee_data":
      return "Fee review needed";
    case "awaiting_settlement":
      return "Transfer processing";
    case "paid_out":
      return "Paid out";
    case "reversed":
      return "Reversed";
    case "disputed":
      return "Disputed";
    case "failed":
      return "Transfer needs review";
    default:
      return "No payout due";
  }
}

export async function GET(request: NextRequest) {
  const { user } = await requireRole(["producer"]);
  const params = request.nextUrl.searchParams;
  const today = new Date();
  const from = safeDate(
    params.get("from"),
    new Date(today.getTime() - 29 * DAY_MS)
  );
  const toStart = safeDate(params.get("to"), today);
  const to = new Date(toStart.getTime() + DAY_MS);
  const selectedStatus = params.get("status") || "";

  if (
    to <= from ||
    to.getTime() - from.getTime() > 366 * DAY_MS ||
    (selectedStatus && !allowedStatuses.has(selectedStatus))
  ) {
    return NextResponse.json(
      { error: "Choose a valid date range and payout status." },
      { status: 400 }
    );
  }

  await connectMongoose();
  const entries = await EarningsLedgerModel.find({
    producerId: user.id,
    entryType: "sale",
    createdAt: { $gte: from, $lt: to },
  })
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();
  const transfers = await PayoutTransferModel.find({
    producerId: user.id,
    createdAt: { $gte: from, $lt: to },
  })
    .select({ orderId: 1, orderItemIdx: 1, status: 1 })
    .lean();
  const transferByItem = new Map(
    transfers.map((transfer) => [
      `${transfer.orderId}:${transfer.orderItemIdx}`,
      transfer.status,
    ])
  );
  const rows = entries
    .map((entry) => ({
      entry,
      status: transferByItem.get(`${entry.orderId}:${entry.orderItemIdx}`),
    }))
    .filter(({ status }) => !selectedStatus || status === selectedStatus);
  const header = [
    "Date",
    "Beat",
    "License",
    "Sale amount minor units",
    "Currency",
    "Payout status",
  ];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map(({ entry, status }) =>
      [
        new Date(entry.createdAt).toISOString(),
        entry.trackTitle,
        entry.licenseTier,
        entry.grossAmount,
        entry.currency,
        statusLabel(status),
      ]
        .map(csvCell)
        .join(",")
    ),
  ].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="beatbazaar-sales.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
