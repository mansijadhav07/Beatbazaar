export const up = async (db) => {
  await db.collection("producerprofiles").createIndex(
    { payoutAccountRef: 1 },
    {
      unique: true,
      partialFilterExpression: { payoutAccountRef: { $type: "string" } },
      name: "idx_producer_payout_account_unique",
    }
  );

  await db.collection("orders").createIndex(
    { providerOrderId: 1 },
    { unique: true, sparse: true, name: "providerOrderId_1" }
  );

  const payoutTransfers = db.collection("payout_transfers");
  await payoutTransfers.createIndex(
    { idempotencyKey: 1 },
    { unique: true, name: "idempotencyKey_1" }
  );
  await payoutTransfers.createIndex(
    { orderId: 1, orderItemIdx: 1 },
    { unique: true, name: "idx_payout_transfer_order_item_unique" }
  );
  await payoutTransfers.createIndex(
    { producerId: 1, createdAt: -1 },
    { name: "idx_payout_transfer_producer_created" }
  );
  await payoutTransfers.createIndex(
    { providerTransferId: 1 },
    { unique: true, sparse: true, name: "providerTransferId_1" }
  );
  await payoutTransfers.createIndex(
    { reversalId: 1 },
    { unique: true, sparse: true, name: "reversalId_1" }
  );
  await payoutTransfers.createIndex(
    { producerId: 1, status: 1, holdReleaseAt: 1 },
    { name: "idx_payout_transfer_producer_status_hold" }
  );
  await payoutTransfers.createIndex(
    { status: 1, creationLeaseUntil: 1 },
    { name: "idx_payout_transfer_creation_lease" }
  );

  const reports = db.collection("reconciliation_reports");
  await reports.createIndex(
    { runId: 1 },
    { unique: true, name: "runId_1" }
  );
  await reports.createIndex(
    { createdAt: -1 },
    { name: "createdAt_-1" }
  );

  const ledgerExists = await db
    .listCollections({ name: "earningsledgers" })
    .hasNext();
  if (ledgerExists) {
    const ledger = db.collection("earningsledgers");
    const indexes = await ledger.indexes();
    const oldIndex = indexes.find(
      (index) =>
        index.key.orderId === 1 &&
        index.key.orderItemIdx === 1 &&
        index.key.entryType === 1 &&
        index.unique === true
    );
    if (oldIndex?.name) await ledger.dropIndex(oldIndex.name);
    await ledger.createIndex(
      { orderId: 1, orderItemIdx: 1, entryType: 1 },
      {
        unique: true,
        partialFilterExpression: {
          entryType: { $in: ["sale", "reversal"] },
        },
        name: "idx_earnings_order_item_sales_reversals",
      }
    );
    await ledger.createIndex(
      { eventKey: 1 },
      { unique: true, sparse: true, name: "eventKey_1" }
    );
    await ledger.createIndex(
      { producerId: 1, createdAt: -1 },
      { name: "idx_earnings_producer_created" }
    );
  }
};

export const down = async (db) => {
  await db.collection("producerprofiles").dropIndex("idx_producer_payout_account_unique");
  await db.collection("orders").dropIndex("providerOrderId_1");
  await db.collection("payout_transfers").dropIndex("idempotencyKey_1");
  await db.collection("payout_transfers").dropIndex("idx_payout_transfer_order_item_unique");
  await db.collection("payout_transfers").dropIndex("idx_payout_transfer_producer_created");
  await db.collection("payout_transfers").dropIndex("providerTransferId_1");
  await db.collection("payout_transfers").dropIndex("reversalId_1");
  await db.collection("payout_transfers").dropIndex("idx_payout_transfer_producer_status_hold");
  await db.collection("payout_transfers").dropIndex("idx_payout_transfer_creation_lease");
  await db.collection("reconciliation_reports").dropIndex("runId_1");
  await db.collection("reconciliation_reports").dropIndex("createdAt_-1");

  const ledgerExists = await db
    .listCollections({ name: "earningsledgers" })
    .hasNext();
  if (ledgerExists) {
    const ledger = db.collection("earningsledgers");
    await ledger.dropIndex("idx_earnings_order_item_sales_reversals");
    await ledger.dropIndex("eventKey_1");
    await ledger.dropIndex("idx_earnings_producer_created");
    await ledger.createIndex(
      { orderId: 1, orderItemIdx: 1, entryType: 1 },
      { unique: true, name: "orderId_1_orderItemIdx_1_entryType_1" }
    );
  }
};
