import "server-only";
import { connectMongoose } from "@/server/db/mongoose";
import { JobModel, type IJob } from "@/server/db/models/Job";

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

export async function enqueueJob(
  type: string,
  payload: Record<string, any>,
  options?: EnqueueOptions
): Promise<IJob> {
  await connectMongoose();
  return JobModel.create({
    type,
    payload,
    runAt: options?.runAt || new Date(),
    maxAttempts: options?.maxAttempts || 3,
    status: "pending",
  });
}

/**
 * Atomically claim a pending job using findOneAndUpdate.
 * Also reclaims stale jobs that have been locked longer than staleTimeoutMs (default 5 minutes).
 */
export async function claimNextJob(
  workerId: string,
  staleTimeoutMs = 5 * 60 * 1000
): Promise<IJob | null> {
  await connectMongoose();
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - staleTimeoutMs);

  const job = await JobModel.findOneAndUpdate(
    {
      $or: [
        { status: "pending", runAt: { $lte: now } },
        { status: "processing", lockedAt: { $lte: staleThreshold } },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        lockedBy: workerId,
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { runAt: 1 },
      new: true,
    }
  );

  return job;
}

export async function completeJob(jobId: string): Promise<void> {
  await connectMongoose();
  await JobModel.findByIdAndUpdate(jobId, {
    $set: {
      status: "completed",
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await connectMongoose();
  const job = await JobModel.findById(jobId);
  if (!job) return;

  const willRetry = job.attempts < job.maxAttempts;
  const backoffMinutes = Math.pow(2, job.attempts); // exponential backoff
  const nextRunAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

  await JobModel.findByIdAndUpdate(jobId, {
    $set: {
      status: willRetry ? "pending" : "failed",
      error,
      runAt: willRetry ? nextRunAt : job.runAt,
      lockedAt: null,
      lockedBy: null,
    },
  });
}

/**
 * Reclaim stale jobs that have been locked in "processing" beyond the timeout.
 */
export async function reclaimStaleJobs(staleTimeoutMs = 5 * 60 * 1000): Promise<{ reclaimedCount: number }> {
  try {
    await connectMongoose();
    const staleThreshold = new Date(Date.now() - staleTimeoutMs);
    const result = await JobModel.updateMany(
      {
        status: "processing",
        lockedAt: { $lte: staleThreshold },
      },
      {
        $set: {
          status: "pending",
          lockedAt: null,
          lockedBy: null,
        },
      }
    );
    return { reclaimedCount: result.modifiedCount };
  } catch (err: unknown) {
    console.error("[Job Queue] Error reclaiming stale jobs:", err);
    return { reclaimedCount: 0 };
  }
}


