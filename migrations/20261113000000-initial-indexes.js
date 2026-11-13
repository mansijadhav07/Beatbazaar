export const up = async (db) => {
  // 1. Tracks indexes
  await db.collection("tracks").createIndex(
    { status: 1, genre: 1, bpm: 1, createdAt: -1 },
    { name: "idx_tracks_catalog_filter" }
  );
  await db.collection("tracks").createIndex(
    { slug: 1 },
    { unique: true, name: "idx_tracks_slug_unique" }
  );
  await db.collection("tracks").createIndex(
    { title: "text", tags: "text", moods: "text" },
    { name: "idx_tracks_search_text" }
  );

  // 2. Producer profiles indexes
  await db.collection("producer_profiles").createIndex(
    { slug: 1 },
    { unique: true, name: "idx_producer_profiles_slug_unique" }
  );
  await db.collection("producer_profiles").createIndex(
    { userId: 1 },
    { unique: true, name: "idx_producer_profiles_user_unique" }
  );
  await db.collection("producer_profiles").createIndex(
    { "location.country": 1, "location.state": 1, "location.city": 1 },
    { name: "idx_producer_profiles_location" }
  );

  // 3. Orders indexes
  await db.collection("orders").createIndex(
    { paymentRef: 1 },
    { unique: true, sparse: true, name: "idx_orders_payment_ref_unique" }
  );
  await db.collection("orders").createIndex(
    { buyerId: 1, createdAt: -1 },
    { name: "idx_orders_buyer_history" }
  );

  // 4. Downloads indexes (including TTL)
  await db.collection("downloads").createIndex(
    { token: 1 },
    { unique: true, name: "idx_downloads_token_unique" }
  );
  await db.collection("downloads").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "idx_downloads_ttl_expiry" }
  );

  // 5. Payouts indexes
  await db.collection("payouts").createIndex(
    { producerId: 1, period: 1 },
    { unique: true, name: "idx_payouts_producer_period_unique" }
  );

  // 6. Audit logs indexes
  await db.collection("audit_logs").createIndex(
    { actorId: 1, timestamp: -1 },
    { name: "idx_audit_logs_actor" }
  );
};

export const down = async (db) => {
  await db.collection("tracks").dropIndex("idx_tracks_catalog_filter");
  await db.collection("tracks").dropIndex("idx_tracks_slug_unique");
  await db.collection("tracks").dropIndex("idx_tracks_search_text");
  await db.collection("producer_profiles").dropIndex("idx_producer_profiles_slug_unique");
  await db.collection("producer_profiles").dropIndex("idx_producer_profiles_user_unique");
  await db.collection("producer_profiles").dropIndex("idx_producer_profiles_location");
  await db.collection("orders").dropIndex("idx_orders_payment_ref_unique");
  await db.collection("orders").dropIndex("idx_orders_buyer_history");
  await db.collection("downloads").dropIndex("idx_downloads_token_unique");
  await db.collection("downloads").dropIndex("idx_downloads_ttl_expiry");
  await db.collection("payouts").dropIndex("idx_payouts_producer_period_unique");
  await db.collection("audit_logs").dropIndex("idx_audit_logs_actor");
};

