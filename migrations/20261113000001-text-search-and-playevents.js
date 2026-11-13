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

  // Create unified text index covering title, tags, genre, moods and producerName with default_language "none"
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
    }
  );

  // Play events hourly index for play buffering
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

