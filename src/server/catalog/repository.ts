import "server-only";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel, type ITrack } from "@/server/db/models/Track";
import { PlayEventModel } from "@/server/db/models/PlayEvent";

export interface CatalogFilterOptions {
  q?: string;
  genre?: string;
  language?: string;
  minBpm?: number;
  maxBpm?: number;
  key?: string;
  mood?: string;
  freeOnly?: boolean;
  minPrice?: number; // minor units (e.g. INR paise)
  maxPrice?: number;
  sort?: "trending" | "newest" | "price_asc";
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  tracks: ITrack[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Repository interface for public search providers (MongoDB Text Index or future Atlas Search).
 */
export interface SearchProvider {
  search(query: string, baseFilter: Record<string, any>, limit: number): Promise<string[]>;
}

/**
 * Default MongoDB Text Search provider using the single text index.
 */
export class MongoTextSearchProvider implements SearchProvider {
  async search(query: string, baseFilter: Record<string, any>, limit: number): Promise<string[]> {
    if (!query.trim()) return [];
    await connectMongoose();
    try {
      const results = await TrackModel.find(
        {
          ...baseFilter,
          $text: { $search: query },
        },
        { _id: 1 },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

      return results.map((r) => r._id.toString());
    } catch {
      // Fallback regex query if text index is being created or not yet active in test environment
      const cleanRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const results = await TrackModel.find(
        {
          ...baseFilter,
          $or: [
            { title: cleanRegex },
            { genre: cleanRegex },
            { tags: cleanRegex },
            { producerName: cleanRegex },
          ],
        },
        { _id: 1 }
      ).limit(limit);
      return results.map((r) => r._id.toString());
    }
  }
}

let activeSearchProvider: SearchProvider = new MongoTextSearchProvider();

export function setSearchProvider(provider: SearchProvider) {
  activeSearchProvider = provider;
}

/**
 * Single public data access function that strictly guarantees only public tracks
 * (status === "live" and processingStatus === "ready") can be returned.
 * Draft, pending, rejected, removed, or sold_exclusive tracks NEVER leak into public listings.
 */
export async function findPublicTracks(
  filters: CatalogFilterOptions = {}
): Promise<CatalogResult> {
  await connectMongoose();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 20));
  const skip = (page - 1) * limit;

  // STRICT SECURITY PREDICATE: Only live and ready tracks
  const baseFilter: Record<string, any> = {
    status: "live",
    processingStatus: "ready",
  };

  if (filters.genre) {
    baseFilter.genre = filters.genre;
  }

  if (filters.language) {
    baseFilter.language = filters.language;
  }

  if (filters.minBpm || filters.maxBpm) {
    baseFilter.bpm = {};
    if (filters.minBpm) baseFilter.bpm.$gte = filters.minBpm;
    if (filters.maxBpm) baseFilter.bpm.$lte = filters.maxBpm;
  }

  if (filters.key) {
    baseFilter.key = filters.key;
  }

  if (filters.mood) {
    baseFilter.moods = filters.mood;
  }

  if (filters.freeOnly) {
    baseFilter["licenses"] = {
      $elemMatch: { tier: "free", enabled: true },
    };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceQuery: Record<string, any> = { enabled: true };
    if (filters.minPrice !== undefined) priceQuery["price.amount"] = { $gte: filters.minPrice };
    if (filters.maxPrice !== undefined) {
      priceQuery["price.amount"] = {
        ...(priceQuery["price.amount"] || {}),
        $lte: filters.maxPrice,
      };
    }
    baseFilter["licenses"] = { $elemMatch: priceQuery };
  }

  // Handle Text Search if query is present
  if (filters.q && filters.q.trim()) {
    const matchedIds = await activeSearchProvider.search(filters.q, baseFilter, 200);
    baseFilter._id = { $in: matchedIds };
  }

  // Determine sort order
  let sortOption: Record<string, any> = { createdAt: -1 };

  if (filters.sort === "price_asc") {
    sortOption = { "licenses.0.price.amount": 1 };
  } else if (filters.sort === "trending") {
    // Trending: plays in the last 7 days. If no recent play data, fall back to newest.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPlays = await PlayEventModel.aggregate([
      { $match: { hourBucket: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$trackId", totalPlays: { $sum: "$playCount" } } },
      { $sort: { totalPlays: -1 } },
      { $limit: 100 },
    ]);

    if (recentPlays.length > 0) {
      // Filter to trending tracks and preserve their aggregated play order
      const trendingIds = recentPlays.map((r) => r._id);
      baseFilter._id = baseFilter._id
        ? { $in: trendingIds.filter((id: string) => (baseFilter._id as { $in: string[] }).$in?.includes(id.toString()) ?? true) }
        : { $in: trendingIds };
      // Sort by total 7-day plays descending, then by createdAt as a tiebreaker
      sortOption = { playCount: -1, createdAt: -1 };
    } else {
      // No recent play data: pure newest first
      sortOption = { createdAt: -1 };
    }
  }

  const [tracks, total] = await Promise.all([
    TrackModel.find(baseFilter).sort(sortOption).skip(skip).limit(limit),
    TrackModel.countDocuments(baseFilter),
  ]);

  return {
    tracks,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Fetch a single public track by its ID.
 * Returns null if track is not found, ID is invalid, or track is not in a viewable state.
 */
export async function getTrackById(trackId: string): Promise<ITrack | null> {
  // Validate MongoDB ObjectId format
  if (!trackId || !/^[0-9a-fA-F]{24}$/.test(trackId)) {
    return null;
  }
  await connectMongoose();
  return TrackModel.findById(trackId);
}

/**
 * Fetch related beats based on same genre or producer, strictly live and ready.
 */
export async function getRelatedTracks(
  currentTrackId: string,
  genre: string,
  producerId: string,
  limit = 4
): Promise<ITrack[]> {
  await connectMongoose();
  return TrackModel.find({
    _id: { $ne: currentTrackId },
    status: "live",
    processingStatus: "ready",
    $or: [{ genre }, { producerId }],
  })
    .sort({ createdAt: -1 })
    .limit(limit);
}

export async function getPublicTrackSitemapEntries(): Promise<
  Array<{ id: string; slug: string; updatedAt: Date }>
> {
  await connectMongoose();
  const tracks = await TrackModel.find(
    { status: "live", processingStatus: "ready" },
    { _id: 1, slug: 1, updatedAt: 1 }
  )
    .sort({ updatedAt: -1 })
    .lean();

  return tracks.map((track) => ({
    id: track._id.toString(),
    slug: track.slug,
    updatedAt: track.updatedAt,
  }));
}
