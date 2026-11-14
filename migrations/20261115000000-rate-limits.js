export const up = async (db) => {
  await db.collection("rate_limits").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "idx_rate_limits_expiry" }
  );
};

export const down = async (db) => {
  await db.collection("rate_limits").dropIndex("idx_rate_limits_expiry");
};
