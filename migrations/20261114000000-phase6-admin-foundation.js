export const up = async (db) => {
  await db.collection("reports").createIndex(
    { status: 1, createdAt: -1 },
    { name: "idx_reports_status_created" }
  );
  await db.collection("reports").createIndex(
    { trackId: 1, createdAt: -1 },
    { name: "idx_reports_track_created" }
  );
  await db.collection("admin_step_up_tokens").createIndex(
    { tokenHash: 1 },
    { unique: true, name: "idx_admin_step_up_token_hash" }
  );
  await db.collection("admin_step_up_tokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "idx_admin_step_up_expiry" }
  );
  await db.collection("tracks").createIndex(
    { featured: 1, updatedAt: -1 },
    { name: "idx_tracks_featured_updated" }
  );
};

export const down = async (db) => {
  await db.collection("reports").dropIndex("idx_reports_status_created");
  await db.collection("reports").dropIndex("idx_reports_track_created");
  await db.collection("admin_step_up_tokens").dropIndex("idx_admin_step_up_token_hash");
  await db.collection("admin_step_up_tokens").dropIndex("idx_admin_step_up_expiry");
  await db.collection("tracks").dropIndex("idx_tracks_featured_updated");
};
