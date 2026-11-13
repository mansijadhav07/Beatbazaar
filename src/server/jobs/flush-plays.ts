import { connectMongoose } from "@/server/db/mongoose";
import { PlayEventModel } from "@/server/db/models/PlayEvent";
import { TrackModel } from "@/server/db/models/Track";

/**
 * Flushes buffered hourly play events into the main Track document play counts.
 * Uses atomic findOneAndDelete or processed state to safely run across multiple workers.
 */
export async function flushBufferedPlays(): Promise<{ flushedTracks: number }> {
  try {
    await connectMongoose();

    // Find any hourly buckets with plays
    const events = await PlayEventModel.find({ playCount: { $gt: 0 } }).limit(100);
    if (!events || events.length === 0) {
      return { flushedTracks: 0 };
    }

    let flushedCount = 0;
    for (const ev of events) {
      // Atomically decrement or extract count from the bucket
      const claimed = await PlayEventModel.findOneAndUpdate(
        { _id: ev._id, playCount: { $gt: 0 } },
        { $set: { playCount: 0 } },
        { new: false }
      );

      if (claimed && claimed.playCount > 0) {
        await TrackModel.updateOne(
          { _id: claimed.trackId },
          { $inc: { playCount: claimed.playCount } }
        );
        flushedCount++;
      }
    }

    return { flushedTracks: flushedCount };
  } catch (err: unknown) {
    console.error("[Play Flush] Error flushing plays:", err);
    return { flushedTracks: 0 };
  }
}

