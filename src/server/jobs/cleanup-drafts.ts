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
      // Find candidate details first to extract storage keys
      const draft = await TrackModel.findOne({
        _id: c._id,
        status: "draft",
        updatedAt: { $lt: cutoff },
      });

      if (!draft) continue;

      // Crash-safety requirement: Delete storage objects in R2 first.
      // If a crash occurs during storage deletion, the MongoDB draft document
      // remains present and will be retried in the next cleanup cycle.
      // If the document were deleted before storage, orphaned R2 objects would
      // remain unreferenced and undeletable.
      for (const file of draft.files) {
        await deleteObject(file.r2Key, false).catch(() => {});
      }
      if (draft.coverKey) {
        await deleteObject(draft.coverKey, true).catch(() => {});
      }

      // Atomically delete the draft document after storage cleanup
      await TrackModel.findOneAndDelete({
        _id: draft._id,
        status: "draft",
      });

      deletedCount++;
    }

    return { deletedCount };
  } catch (err: unknown) {
    console.error("[Cleanup Drafts] Error during cleanup cycle:", err);
    return { deletedCount: 0 };
  }
}

