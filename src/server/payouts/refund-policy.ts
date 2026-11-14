export function shouldHoldTransferBeforeRefund(
  settlementStatus: string | undefined
): boolean {
  return settlementStatus !== "settled";
}

export function buildRefundProviderOptions(
  orderId: string,
  hasRouteTransfers: boolean
): { reverseAll: boolean; idempotencyKey: string } {
  return {
    reverseAll: hasRouteTransfers,
    idempotencyKey: `admin-order-refund:${orderId}`,
  };
}

export interface RefundReversalEntry {
  producerId: string;
  orderId: string;
  orderItemIdx: number;
  entryType: "reversal";
  trackId: string;
  trackTitle: string;
  licenseTier: "free" | "non_exclusive" | "exclusive";
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  gatewayFee: number;
  currency: "INR" | "USD";
  status: "voided";
}

export function buildRefundReversalEntry(
  input: RefundReversalEntry
): RefundReversalEntry {
  return input;
}
