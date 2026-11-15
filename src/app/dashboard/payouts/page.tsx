import { requireRole } from "@/server/auth/guards";
import { connectMongoose } from "@/server/db/mongoose";
import { EarningsLedgerModel } from "@/server/db/models/EarningsLedger";
import { PlayEventModel } from "@/server/db/models/PlayEvent";
import { PayoutTransferModel } from "@/server/db/models/PayoutTransfer";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import { TrackModel } from "@/server/db/models/Track";
import { siteConfig } from "@/config/site";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  status?: string;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string | undefined, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount / 100);
}

function payoutStatusLabel(status: string | undefined): string {
  switch (status) {
    case "pending_hold":
      return "Pending hold";
    case "awaiting_kyc":
      return "Awaiting payout setup";
    case "awaiting_account_cooling":
      return "Waiting for Razorpay account cooling period";
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

function statusColor(status: string | undefined): string {
  if (status === "paid_out") return "text-green-800";
  if (status === "disputed" || status === "failed") return "text-red-800";
  if (
    status === "awaiting_kyc" ||
    status === "awaiting_account_cooling" ||
    status === "awaiting_fee_data"
  ) {
    return "text-amber-900";
  }
  return "text-steel-dark";
}

export default async function ProducerPayoutsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user } = await requireRole(["producer"]);
  const params = await searchParams;
  const today = new Date();
  const from = parseDate(
    params.from,
    new Date(today.getTime() - 29 * DAY_MS)
  );
  const toStart = parseDate(params.to, today);
  const to = new Date(toStart.getTime() + DAY_MS);
  const fromValue = from.toISOString().slice(0, 10);
  const toValue = new Date(to.getTime() - 1).toISOString().slice(0, 10);
  const validStatuses = new Set([
    "awaiting_kyc",
    "awaiting_account_cooling",
    "awaiting_fee_data",
    "pending_hold",
    "awaiting_settlement",
    "paid_out",
    "reversed",
    "disputed",
    "failed",
  ]);
  const selectedStatus =
    params.status && validStatuses.has(params.status) ? params.status : "";

  await connectMongoose();
  const profile = await ProducerProfileModel.findOne({
    userId: user.id,
  }).lean();
  const ledgerEntries = await EarningsLedgerModel.find({
    producerId: user.id,
    entryType: "sale",
    createdAt: { $gte: from, $lt: to },
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const payoutTransfers = await PayoutTransferModel.find({
    producerId: user.id,
    createdAt: { $gte: from, $lt: to },
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const transferTotals = await PayoutTransferModel.aggregate<{
    _id: string;
    amount: number;
  }>([
    {
      $match: {
        producerId: user.id,
        createdAt: { $gte: from, $lt: to },
      },
    },
    {
      $group: {
        _id: "$status",
        amount: { $sum: { $ifNull: ["$netAmount", 0] } },
      },
    },
  ]);
  const upcomingHolds = await PayoutTransferModel.find({
    producerId: user.id,
    status: "pending_hold",
  })
    .sort({ holdReleaseAt: 1 })
    .limit(10)
    .lean();
  const transferByItem = new Map(
    payoutTransfers.map((transfer) => [
      `${transfer.orderId}:${transfer.orderItemIdx}`,
      transfer,
    ])
  );
  const sales = ledgerEntries
    .map((entry) => ({
      entry,
      transfer: transferByItem.get(`${entry.orderId}:${entry.orderItemIdx}`),
    }))
    .filter(
      ({ transfer }) => !selectedStatus || transfer?.status === selectedStatus
    );

  const totalsByStatus = new Map(
    transferTotals.map((total) => [total._id, total.amount])
  );
  const totals = {
    awaitingKyc: totalsByStatus.get("awaiting_kyc") || 0,
    accountCooling: totalsByStatus.get("awaiting_account_cooling") || 0,
    pendingHold: totalsByStatus.get("pending_hold") || 0,
    processing: totalsByStatus.get("awaiting_settlement") || 0,
    paidOut: totalsByStatus.get("paid_out") || 0,
    reversed: totalsByStatus.get("reversed") || 0,
    disputed: totalsByStatus.get("disputed") || 0,
    feeReview: totalsByStatus.get("awaiting_fee_data") || 0,
  };

  const tracks = await TrackModel.find({ producerId: user.id })
    .select({ _id: 1, title: 1, playCount: 1 })
    .sort({ title: 1 })
    .lean();
  const trackIds = tracks.map((track) => track._id.toString());
  const playRows = trackIds.length
    ? await PlayEventModel.aggregate<{
        _id: string;
        plays: number;
      }>([
        {
          $match: {
            trackId: { $in: trackIds },
            hourBucket: { $gte: from, $lt: to },
          },
        },
        { $group: { _id: "$trackId", plays: { $sum: "$playCount" } } },
      ])
    : [];
  const playCountByTrack = new Map(
    playRows.map((row) => [row._id, row.plays])
  );
  const salesByTrackRows = trackIds.length
    ? await EarningsLedgerModel.aggregate<{ _id: string; sales: number }>([
        {
          $match: {
            producerId: user.id,
            entryType: "sale",
            trackId: { $in: trackIds },
            createdAt: { $gte: from, $lt: to },
          },
        },
        { $group: { _id: "$trackId", sales: { $sum: 1 } } },
      ])
    : [];
  const salesByTrack = new Map(
    salesByTrackRows.map((row) => [row._id, row.sales])
  );

  const storedKycStatus = profile?.kycStatus || "not_started";
  const kycStatus =
    storedKycStatus === "pending"
      ? "in_review"
      : storedKycStatus === "verified"
        ? "active"
        : storedKycStatus;
  const onboardingStatusMessage =
    kycStatus === "active"
      ? "Payout setup is active. Eligible transfers are sent automatically after the hold period."
      : kycStatus === "needs_more_information"
        ? "Razorpay needs more information. Follow the next steps shown in your Razorpay account."
        : kycStatus === "rejected"
          ? "Razorpay could not approve this payout account. Check the rejection notice for next steps."
          : kycStatus === "in_review"
            ? "Razorpay is reviewing your payout details. Watch for an update from Razorpay."
            : "Set up a linked account to receive eligible INR transfers.";

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-medium uppercase tracking-wide text-steel">
          Producer account
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Earnings and payouts
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-steel-dark">
          Sales are paid in INR. Once an order is verified as paid, a transfer
          is held for the configured refund window, then sent automatically to
          your active Razorpay linked account. There is no withdraw button.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-steel-dark">
          The current hold setting is {siteConfig.refundWindowDays} days. This
          is a placeholder and needs approval before launch. Payouts are in
          Razorpay test mode and no live funds are moved.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-steel-dark">
          Razorpay applies a 24-hour cooling period to new linked accounts.
          Bank settlements may then take 2 working days after transfer
          processing. These provider timelines are separate from the refund hold.
        </p>
      </header>

      <section
        aria-labelledby="payout-status-heading"
        className="border-b border-border pb-7"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3
              id="payout-status-heading"
              className="text-lg font-semibold text-ink"
            >
              Payout account
            </h3>
            <p className="mt-1 text-sm leading-6 text-steel-dark">
              {onboardingStatusMessage}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold capitalize text-ink">
            {kycStatus.replaceAll("_", " ")}
          </p>
        </div>
        {(profile?.payoutRequiredActions || []).length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-amber-900">
            {profile?.payoutRequiredActions.map((action) => (
              <li key={action}>
                {action === "provider_action_required"
                  ? "Razorpay has requested an update."
                  : action === "settlement_account_verification"
                    ? "Razorpay is verifying the settlement account."
                    : "Razorpay is reviewing the account."}
              </li>
            ))}
          </ul>
        )}
        {kycStatus === "not_started" && <OnboardingForm />}
        {kycStatus === "needs_more_information" && (
          <p className="mt-3 text-sm text-steel-dark">
            Review the request in your Razorpay account and submit the information there.
          </p>
        )}
        {kycStatus === "rejected" && (
          <p className="mt-3 text-sm text-steel-dark">
            Review the rejection notice in Razorpay and follow its next-step instructions.
          </p>
        )}
      </section>

      <section aria-labelledby="earnings-summary-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3
              id="earnings-summary-heading"
              className="text-lg font-semibold text-ink"
            >
              Earnings summary
            </h3>
            <p className="mt-1 text-sm text-steel-dark">
              Transfers created from {fromValue} through {toValue}.
            </p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-steel-dark">
              From
              <input
                type="date"
                name="from"
                defaultValue={fromValue}
                className="mt-1 block h-11 rounded border border-border bg-surface-muted px-3 text-base text-ink"
              />
            </label>
            <label className="text-sm text-steel-dark">
              To
              <input
                type="date"
                name="to"
                defaultValue={toValue}
                className="mt-1 block h-11 rounded border border-border bg-surface-muted px-3 text-base text-ink"
              />
            </label>
            {selectedStatus && (
              <input type="hidden" name="status" value={selectedStatus} />
            )}
            <button
              type="submit"
              className="h-11 rounded border border-ink px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
            >
              Apply dates
            </button>
          </form>
        </div>
        <dl className="grid gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm text-steel-dark">Pending hold</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.pendingHold)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">Awaiting payout setup</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.awaitingKyc)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">
              Waiting for account cooling period
            </dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.accountCooling)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">Transfer processing</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.processing)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">Paid out</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.paidOut)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">Reversed</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.reversed)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-steel-dark">Disputed</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">
              {formatInr(totals.disputed)}
            </dd>
          </div>
          {totals.feeReview > 0 && (
            <div>
              <dt className="text-sm text-steel-dark">Fee review needed</dt>
              <dd className="mt-1 text-lg font-semibold text-amber-900">
                {formatInr(totals.feeReview)}
              </dd>
            </div>
          )}
        </dl>
        {upcomingHolds.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-ink">
              Upcoming hold releases
            </h4>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {upcomingHolds.map((transfer) => (
                  <li
                    key={transfer._id.toString()}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <span className="text-ink">{transfer.trackTitle}</span>
                    <span className="text-steel-dark">
                      {formatInr(transfer.netAmount || 0)} · Releases{" "}
                      {new Date(transfer.holdReleaseAt).toLocaleDateString(
                        "en-IN",
                        { dateStyle: "medium", timeZone: "UTC" }
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="sales-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="sales-heading" className="text-lg font-semibold text-ink">
              Sales
            </h3>
            <p className="mt-1 text-sm text-steel-dark">
              Showing up to 500 sales for the selected dates.
            </p>
          </div>
          <a
            href={`/api/producer/payout-sales.csv?from=${fromValue}&to=${toValue}${selectedStatus ? `&status=${selectedStatus}` : ""}`}
            className="inline-flex h-11 items-center rounded border border-ink px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
          >
            Export CSV
          </a>
        </div>
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="from" value={fromValue} />
          <input type="hidden" name="to" value={toValue} />
          <label className="text-sm text-steel-dark">
            Payout status
            <select
              name="status"
              defaultValue={selectedStatus}
              className="mt-1 block h-11 rounded border border-border bg-surface-muted px-3 text-base text-ink"
            >
              <option value="">All statuses</option>
              <option value="awaiting_kyc">Awaiting payout setup</option>
              <option value="pending_hold">Pending hold</option>
              <option value="awaiting_settlement">Transfer processing</option>
              <option value="paid_out">Paid out</option>
              <option value="reversed">Reversed</option>
              <option value="disputed">Disputed</option>
              <option value="awaiting_fee_data">Fee review needed</option>
              <option value="failed">Transfer needs review</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded border border-ink px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
          >
            Filter sales
          </button>
        </form>
        {sales.length === 0 ? (
          <p className="border-y border-border py-6 text-sm text-steel-dark">
            No sales match this date range and filter.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border border-y border-border sm:hidden">
              {sales.map(({ entry, transfer }) => (
                <li key={entry._id.toString()} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words font-medium text-ink">
                      {entry.trackTitle}
                    </p>
                    <p className="shrink-0 text-sm font-medium text-ink">
                      {formatInr(entry.grossAmount)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-steel-dark">
                    <span>
                      {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      })}
                      {" · "}
                      {entry.licenseTier.replaceAll("_", " ")}
                    </span>
                    <span className={statusColor(transfer?.status)}>
                      {payoutStatusLabel(transfer?.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden border-y border-border sm:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-steel-dark">
                  <tr>
                    <th scope="col" className="w-28 px-3 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Beat</th>
                    <th scope="col" className="w-32 px-3 py-3 font-semibold">License</th>
                    <th scope="col" className="w-32 px-3 py-3 font-semibold">Sale</th>
                    <th scope="col" className="w-40 px-3 py-3 font-semibold">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sales.map(({ entry, transfer }) => (
                    <tr key={entry._id.toString()}>
                      <td className="px-3 py-3 text-steel-dark">
                        {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="break-words px-3 py-3 font-medium text-ink">
                        {entry.trackTitle}
                      </td>
                      <td className="px-3 py-3 capitalize text-steel-dark">
                        {entry.licenseTier.replaceAll("_", " ")}
                      </td>
                      <td className="px-3 py-3 text-ink">
                        {formatInr(entry.grossAmount)}
                      </td>
                      <td
                        className={`px-3 py-3 font-medium ${statusColor(transfer?.status)}`}
                      >
                        {payoutStatusLabel(transfer?.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="beat-activity-heading">
        <h3
          id="beat-activity-heading"
          className="text-lg font-semibold text-ink"
        >
          Beat activity
        </h3>
        <p className="mt-1 text-sm text-steel-dark">
          Plays and sales recorded from {fromValue} through {toValue}.
        </p>
        {tracks.length === 0 ? (
          <p className="mt-4 border-y border-border py-6 text-sm text-steel-dark">
            Your beats will appear here after you publish them.
          </p>
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border border-y border-border sm:hidden">
              {tracks.map((track) => (
                <li
                  key={track._id.toString()}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
                    {track.title}
                  </span>
                  <span className="shrink-0 text-right text-xs text-steel-dark">
                    {playCountByTrack.get(track._id.toString()) || 0} plays
                    {" · "}
                    {salesByTrack.get(track._id.toString()) || 0} sales
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden border-y border-border sm:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-steel-dark">
                  <tr>
                    <th scope="col" className="px-3 py-3 font-semibold">Beat</th>
                    <th scope="col" className="w-36 px-3 py-3 font-semibold">Recorded plays</th>
                    <th scope="col" className="w-24 px-3 py-3 font-semibold">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tracks.map((track) => (
                    <tr key={track._id.toString()}>
                      <td className="break-words px-3 py-3 font-medium text-ink">
                        {track.title}
                      </td>
                      <td className="px-3 py-3 text-steel-dark">
                        {playCountByTrack.get(track._id.toString()) || 0}
                      </td>
                      <td className="px-3 py-3 text-steel-dark">
                        {salesByTrack.get(track._id.toString()) || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
