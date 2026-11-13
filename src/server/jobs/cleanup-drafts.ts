import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel } from "@/server/db/models/Track";
import { deleteObject } from "@/server/storage/r2";

/**
 * Cleans up abandoned drafts older than 24 hours and purges any uploaded storage objects.
 */
export async function cleanupAbandonedDrafts(): Promise<{ deletedCount: number }> {
  await connectMongoose();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const abandonedDrafts = await TrackModel.find({
    status: "draft",
    updatedAt: { $lt: cutoff },
  });

  let deletedCount = 0;
  for (const draft of abandonedDrafts) {
    for (const file of draft.files) {
      await deleteObject(file.r2Key, false).catch(() => {});
    }
    if (draft.coverKey) {
      await deleteObject(draft.coverKey, true).catch(() => {});
    }
    await TrackModel.deleteOne({ _id: draft._id });
    deletedCount++;
  }

  return { deletedCount };
}

