import mongoose, { Schema, type Document, type Model } from "mongoose";

export type PayoutTransferStatus =
  | "awaiting_kyc"
  | "awaiting_account_cooling"
  | "awaiting_fee_data"
  | "creating"
  | "pending_hold"
  | "awaiting_settlement"
  | "paid_out"
  | "reversed"
  | "disputed"
  | "failed";

export interface IPayoutTransfer extends Document {
  producerId: string;
  orderId: string;
  orderItemIdx: number;
  trackId: string;
  trackTitle: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
  paymentId: string;
  linkedAccountId?: string;
  idempotencyKey: string;
  currency: "INR";
  grossAmount: number;
  platformFeeAmount: number;
  gatewayFeeAmount?: number;
  netAmount?: number;
  holdReleaseAt: Date;
  providerTransferId?: string;
  providerTransferStatus?: string;
  providerSettlementStatus?: string;
  settlementId?: string;
  disputeId?: string;
  disputeStatus?: string;
  status: PayoutTransferStatus;
  creationLeaseUntil?: Date;
  reversalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutTransferSchema = new Schema<IPayoutTransfer>(
  {
    producerId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    orderItemIdx: { type: Number, required: true },
    trackId: { type: String, required: true },
    trackTitle: { type: String, required: true },
    licenseTier: {
      type: String,
      enum: ["free", "non_exclusive", "exclusive"],
      required: true,
    },
    paymentId: { type: String, required: true },
    linkedAccountId: { type: String },
    idempotencyKey: { type: String, required: true, unique: true },
    currency: { type: String, enum: ["INR"], required: true },
    grossAmount: { type: Number, required: true, min: 0 },
    platformFeeAmount: { type: Number, required: true, min: 0 },
    gatewayFeeAmount: { type: Number, min: 0 },
    netAmount: { type: Number, min: 0 },
    holdReleaseAt: { type: Date, required: true },
    providerTransferId: { type: String, sparse: true, unique: true },
    providerTransferStatus: { type: String },
    providerSettlementStatus: { type: String },
    settlementId: { type: String },
    disputeId: { type: String },
    disputeStatus: { type: String },
    status: {
      type: String,
      enum: [
        "awaiting_kyc",
        "awaiting_account_cooling",
        "awaiting_fee_data",
        "creating",
        "pending_hold",
        "awaiting_settlement",
        "paid_out",
        "reversed",
        "disputed",
        "failed",
      ],
      required: true,
      index: true,
    },
    creationLeaseUntil: { type: Date },
    reversalId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true, collection: "payout_transfers" }
);

PayoutTransferSchema.index(
  { orderId: 1, orderItemIdx: 1 },
  { unique: true, name: "idx_payout_transfer_order_item_unique" }
);
PayoutTransferSchema.index(
  { producerId: 1, createdAt: -1 },
  { name: "idx_payout_transfer_producer_created" }
);
PayoutTransferSchema.index(
  { producerId: 1, status: 1, holdReleaseAt: 1 },
  { name: "idx_payout_transfer_producer_status_hold" }
);
PayoutTransferSchema.index(
  { status: 1, creationLeaseUntil: 1 },
  { name: "idx_payout_transfer_creation_lease" }
);

export const PayoutTransferModel: Model<IPayoutTransfer> =
  mongoose.models.PayoutTransfer ||
  mongoose.model<IPayoutTransfer>("PayoutTransfer", PayoutTransferSchema);
