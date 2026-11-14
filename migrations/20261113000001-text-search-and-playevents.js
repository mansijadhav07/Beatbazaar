export const up = async (db) => {
  // Drop previous text index if present
  try {
    await db.collection("tracks").dropIndex("idx_tracks_search_text");
  } catch (_e) {
    // Index might not exist or might have default name
  }
  try {
    await db.collection("tracks").dropIndex("TrackTextSearchIndex");
  } catch (_e) {}
  try {
    await db.collection("tracks").dropIndex("idx_tracks_catalog_text_search");
  } catch (_e) {}

  await db.collection("tracks").createIndex(
    {
      title: "text",
      tags: "text",
      genre: "text",
      moods: "text",
      producerName: "text",
    },
    {
      name: "idx_tracks_catalog_text_search",
      default_language: "none",
      language_override: "searchLanguage",
    }
  );

  try {
    await db.collection("playevents").dropIndex("trackId_1_hourBucket_1");
  } catch (_e) {}
  try {
    await db.collection("playevents").dropIndex("idx_playevents_hourly_unique");
  } catch (_e) {}
  await db.collection("playevents").createIndex(
    { trackId: 1, hourBucket: 1 },
    { unique: true, name: "idx_playevents_hourly_unique" }
  );
};

export const down = async (db) => {
  try {
    await db.collection("tracks").dropIndex("idx_tracks_catalog_text_search");
  } catch (_e) {}
  try {
    await db.collection("playevents").dropIndex("idx_playevents_hourly_unique");
  } catch (_e) {}
};
