export const up = async (db) => {
  try {
    await db.collection("tracks").dropIndex("idx_tracks_catalog_text_search");
  } catch {}
  try {
    await db.collection("tracks").dropIndex("TrackTextSearchIndex");
  } catch {}

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
};

export const down = async (db) => {
  try {
    await db.collection("tracks").dropIndex("idx_tracks_catalog_text_search");
  } catch {}

  await db.collection("tracks").createIndex(
    {
      title: "text",
      tags: "text",
      genre: "text",
      moods: "text",
      producerName: "text",
    },
    {
      name: "TrackTextSearchIndex",
      default_language: "none",
    }
  );
};
