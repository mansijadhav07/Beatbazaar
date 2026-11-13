import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import { deleteObject } from "@/server/storage/r2";

/**
 * Cleans up abandoned drafts older than 24 hours and purges any uploaded storage objects.
 * Safe for multiple workers: uses atomic findOneAndDelete per document.
 */
export async function cleanupAbandonedDrafts(): Promise<{ deletedCount: number }> {
  try {
    await connectMongoose();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const candidates = await TrackModel.find(
      {
        status: "draft",
        updatedAt: { $lt: cutoff },
      },
      { _id: 1 }
    ).limit(50);

    let deletedCount = 0;
    for (const c of candidates) {
      // Atomic claim & delete to prevent duplicate worker operations
      const draft = await TrackModel.findOneAndDelete({
        _id: c._id,
        status: "draft",
        updatedAt: { $lt: cutoff },
      });

      if (!draft) continue;

      for (const file of draft.files) {
        await deleteObject(file.r2Key, false).catch(() => {});
      }
      if (draft.coverKey) {
        await deleteObject(draft.coverKey, true).catch(() => {});
      }
      deletedCount++;
    }

    return { deletedCount };
  } catch (err: unknown) {
    console.error("[Cleanup Drafts] Error during cleanup cycle:", err);
    return { deletedCount: 0 };
  }
}

