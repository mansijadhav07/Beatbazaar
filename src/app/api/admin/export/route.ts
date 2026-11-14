import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/server/auth/guards";
import { escapeRegex, validDateParam } from "@/lib/admin-query";
import { AuditLogModel } from "@/server/db/models/AuditLog";
import { OrderModel } from "@/server/db/models/Order";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import { ReportModel } from "@/server/db/models/Report";
import { TrackModel } from "@/server/db/models/Track";
import clientPromise from "@/server/db/mongodb";
import { connectMongoose } from "@/server/db/mongoose";

export const dynamic = "force-dynamic";
const exportLimit = 10_000;

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvResponse(filename: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(content, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

function fromSearch(request: NextRequest, key: string, maxLength = 100): string {
  return (request.nextUrl.searchParams.get(key) || "").trim().slice(0, maxLength);
}

function dateFilter(request: NextRequest, field: string) {
  const from = validDateParam(fromSearch(request, "from", 10));
  const to = validDateParam(fromSearch(request, "to", 10));
  if (!from && !to) return undefined;
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) {
    const end = new Date(to);
    end.setUTCDate(end.getUTCDate() + 1);
    range.$lt = end;
  }
  return { [field]: range };
}

export async function GET(request: NextRequest) {
  await requireRole(["admin"]);
  const type = fromSearch(request, "type", 20);
  if (!["reports", "orders", "payouts", "tracks", "audit", "users"].includes(type)) {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }
  const status = fromSearch(request, "status", 32);
  const search = fromSearch(request, "q", 100);
  await connectMongoose();

  if (type === "reports") {
    const allowedStatuses = ["open", "in_review", "resolved", "dismissed"] as const;
    if (status && status !== "all" && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: "Unknown report status." }, { status: 400 });
    }
    const filter: Record<string, unknown> = status && status !== "all" ? { status } : {};
    if (search) {
      const literal = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ trackTitle: literal }, { reporterEmail: literal }];
    }
    const total = await ReportModel.countDocuments(filter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the report filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await ReportModel.find(filter).sort({ createdAt: -1 }).limit(exportLimit).lean();
    return csvResponse("admin-reports.csv", [
      ["Report ID", "Beat", "Track ID", "Category", "Reporter email", "Details", "Status", "Created"],
      ...rows.map((row) => [
        row._id.toString(), row.trackTitle, row.trackId.toString(), row.category,
        row.reporterEmail, row.details, row.status, row.createdAt.toISOString(),
      ]),
    ]);
  }

  if (type === "orders") {
    const allowedStatuses = ["pending", "paid", "failed", "refunded"] as const;
    if (status && status !== "all" && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: "Unknown order status." }, { status: 400 });
    }
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    Object.assign(filter, dateFilter(request, "createdAt"));
    if (search) {
      const literal = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ buyerEmail: literal }, { paymentRef: literal }];
      if (/^[a-f\d]{24}$/i.test(search)) filter._id = search;
    }
    const total = await OrderModel.countDocuments(filter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the order filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(exportLimit).lean();
    return csvResponse("admin-orders.csv", [
      ["Order ID", "Buyer email", "Status", "Currency", "Total minor units", "Payment reference", "Items", "Created"],
      ...rows.map((row) => [
        row._id.toString(), row.buyerEmail, row.status, row.currency, row.totalAmount,
        row.paymentRef || "", row.items.map((item) => item.title).join("; "), row.createdAt.toISOString(),
      ]),
    ]);
  }

  if (type === "payouts") {
    const allowedStatuses = ["awaiting_kyc", "awaiting_account_cooling", "awaiting_fee_data", "creating", "pending_hold", "awaiting_settlement", "paid_out", "reversed", "disputed", "failed"] as const;
    if (status && status !== "all" && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: "Unknown payout status." }, { status: 400 });
    }
    const filter: Record<string, unknown> = status && status !== "all" ? { status } : {};
    if (search) {
      const literal = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { producerId: literal },
        { orderId: literal },
        { trackTitle: literal },
        { providerTransferId: literal },
      ];
    }
    const total = await PayoutTransferModel.countDocuments(filter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the payout filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await PayoutTransferModel.find(filter).sort({ createdAt: -1 }).limit(exportLimit).lean();
    return csvResponse("admin-payouts.csv", [
      ["Order ID", "Order item", "Producer ID", "Beat", "Gross minor units", "Platform fee minor units", "Gateway fee minor units", "Producer net minor units", "Status", "Hold release date", "Provider transfer ID"],
      ...rows.map((row) => [
        row.orderId, row.orderItemIdx + 1, row.producerId, row.trackTitle, row.grossAmount,
        row.platformFeeAmount, row.gatewayFeeAmount ?? "", row.netAmount ?? "", row.status,
        row.holdReleaseAt.toISOString(), row.providerTransferId || "",
      ]),
    ]);
  }

  if (type === "tracks") {
    const trackStatuses = ["pending", "live", "rejected", "all"] as const;
    const requestedStatus = fromSearch(request, "status", 16);
    const trackStatus = trackStatuses.includes(requestedStatus as (typeof trackStatuses)[number])
      ? requestedStatus
      : "live";
    const filter: Record<string, unknown> = {
      status: trackStatus === "all" ? { $in: [...trackStatuses] } : trackStatus,
    };
    const featured = fromSearch(request, "featured", 8);
    if (featured === "true" || featured === "false") filter.featured = featured === "true";
    if (search) {
      const literal = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: literal }, { producerName: literal }];
    }
    const total = await TrackModel.countDocuments(filter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the beat filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await TrackModel.find(filter).sort({ updatedAt: -1 }).limit(exportLimit).lean();
    return csvResponse("admin-featured-beats.csv", [
      ["Beat ID", "Title", "Producer", "Genre", "Recorded plays", "Featured", "Updated"],
      ...rows.map((row) => [
        row._id.toString(), row.title, row.producerName || "", row.genre, row.playCount,
        row.featured, row.updatedAt.toISOString(),
      ]),
    ]);
  }

  if (type === "audit") {
    const filter: Record<string, unknown> = {};
    const action = fromSearch(request, "action", 80);
    if (action) filter.action = action;
    Object.assign(filter, dateFilter(request, "timestamp"));
    const total = await AuditLogModel.countDocuments(filter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the audit filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await AuditLogModel.find(filter).sort({ timestamp: -1 }).limit(exportLimit).lean();
    return csvResponse("admin-audit-log.csv", [
      ["Timestamp", "Actor ID", "Actor role", "Action", "Target collection", "Target ID", "Before", "After"],
      ...rows.map((row) => [
        row.timestamp.toISOString(), row.actorId, row.actorRole, row.action,
        row.targetCollection, row.targetId, JSON.stringify(row.before || null), JSON.stringify(row.after || null),
      ]),
    ]);
  }

  if (type === "users") {
    const roles = ["buyer", "producer", "admin"] as const;
    const role = fromSearch(request, "role", 16);
    const userFilter: Record<string, unknown> = {};
    if (roles.includes(role as (typeof roles)[number])) userFilter.role = role;
    if (search) {
      const literal = new RegExp(escapeRegex(search), "i");
      userFilter.$or = [{ name: literal }, { email: literal }];
    }
    const client = await clientPromise;
    const users = client.db().collection("user");
    const total = await users.countDocuments(userFilter);
    if (total > exportLimit) {
      return NextResponse.json({ error: "Narrow the user filter to export up to 10,000 rows." }, { status: 413 });
    }
    const rows = await users.find(userFilter, {
      projection: { id: 1, name: 1, email: 1, role: 1, createdAt: 1 },
    }).sort({ createdAt: -1 }).limit(exportLimit).toArray();
    const ids = rows.map((row) => (typeof row.id === "string" ? row.id : row._id.toString()));
    const profiles = await ProducerProfileModel.find({ userId: { $in: ids } })
      .select("userId displayName kycStatus")
      .lean();
    const profilesByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    return csvResponse("admin-users.csv", [
      ["User ID", "Name", "Email", "Role", "Producer profile", "KYC status", "Created"],
      ...rows.map((row) => {
        const id = typeof row.id === "string" ? row.id : row._id.toString();
        const profile = profilesByUser.get(id);
        return [
          id, row.name || "", row.email || "", row.role || "buyer",
          profile?.displayName || "", profile?.kycStatus || "",
          row.createdAt instanceof Date ? row.createdAt.toISOString() : "",
        ];
      }),
    ]);
  }

  return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
}
