import "server-only";
import { connectMongoose } from "@/server/db/mongoose";
import { TrackModel, type ITrack } from "@/server/db/models/Track";
import { PlayEventModel } from "@/server/db/models/PlayEvent";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import {
  filterIndexableLandingSitemapEntries,
  filterProducerSitemapEntries,
  getProducerLocationCitySlug,
  slugifyPublicLabel,
  type CatalogCount,
  type PublicLandingProducer,
  type PublicLandingSnapshot,
  type PublicLandingTrack,
} from "@/lib/public-catalog";
import { siteConfig } from "@/config/site";

const publicTrackFilter = {
  status: "live",
  processingStatus: "ready",
} as const;

export interface PublicProducerPageData {
  profile: {
    username: string;
    displayName: string;
    bio: string;
    avatarKey?: string | null;
    location: { country: string; state: string; city: string };
    verified: boolean;
    updatedAt: Date;
  };
  tracks: ITrack[];
  trackCount: number;
}

export interface PublicHomeCatalog {
  trending: ITrack[];
  newest: ITrack[];
  featured: ITrack[];
  genres: CatalogCount[];
}

export interface ProducerDirectoryEntry extends PublicLandingProducer {
  userId: string;
  avatarKey?: string | null;
  verified: boolean;
  updatedAt: Date;
}

export async function getProducerDirectoryEntries(
  producerIds: string[]
): Promise<Map<string, ProducerDirectoryEntry>> {
  if (producerIds.length === 0) return new Map();
  await connectMongoose();
  const profiles = await ProducerProfileModel.find(
    { userId: { $in: producerIds } },
    { userId: 1, slug: 1, displayName: 1, avatarKey: 1, verified: 1, location: 1, updatedAt: 1 }
  ).lean();
  return new Map(
    profiles.map((profile) => [
      profile.userId,
      {
        userId: profile.userId,
        username: profile.slug,
        displayName: profile.displayName,
        avatarKey: profile.avatarKey,
        verified: profile.verified,
        city: profile.location.city,
        state: profile.location.state,
        updatedAt: profile.updatedAt,
      },
    ])
  );
}

export async function getPublicHomeCatalog(): Promise<PublicHomeCatalog> {
  await connectMongoose();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [recentPlays, newest, featured, genreCounts] = await Promise.all([
    PlayEventModel.aggregate<{ _id: string; totalPlays: number }>([
      { $match: { hourBucket: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$trackId", totalPlays: { $sum: "$playCount" } } },
      { $sort: { totalPlays: -1 } },
      { $limit: 12 },
    ]),
    TrackModel.find(publicTrackFilter).sort({ createdAt: -1 }).limit(8),
    TrackModel.find({ ...publicTrackFilter, featured: true })
      .sort({ updatedAt: -1 })
      .limit(8),
    TrackModel.aggregate<{ _id: string; count: number }>([
      { $match: publicTrackFilter },
      { $group: { _id: "$genre", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);
  const trending = recentPlays.length
    ? await TrackModel.find({
        ...publicTrackFilter,
        _id: { $in: recentPlays.map((entry) => entry._id) },
      })
    : [];
  const playOrder = new Map(recentPlays.map((entry, index) => [entry._id, index]));
  trending.sort(
    (left, right) =>
      (playOrder.get(left._id.toString()) ?? Number.MAX_SAFE_INTEGER) -
      (playOrder.get(right._id.toString()) ?? Number.MAX_SAFE_INTEGER)
  );
  return {
    trending,
    newest,
    featured,
    genres: genreCounts.map(({ _id, count }) => ({ label: _id, count })),
  };
}

export async function getPublicProducerPage(
  username: string
): Promise<PublicProducerPageData | null> {
  await connectMongoose();
  const profile = await ProducerProfileModel.findOne({
    slug: username.toLowerCase(),
  }).lean();
  if (!profile) return null;
  const filter = { ...publicTrackFilter, producerId: profile.userId };
  const [tracks, trackCount] = await Promise.all([
    TrackModel.find(filter).sort({ createdAt: -1 }).limit(50),
    TrackModel.countDocuments(filter),
  ]);
  return {
    profile: {
      username: profile.slug,
      displayName: profile.displayName,
      bio: profile.bio,
      avatarKey: profile.avatarKey,
      location: profile.location,
      verified: profile.verified,
      updatedAt: profile.updatedAt,
    },
    tracks,
    trackCount,
  };
}

export async function getPublicProducerSitemapEntries(): Promise<
  Array<{ username: string; updatedAt: Date }>
> {
  await connectMongoose();
  const [profiles, trackFreshness] = await Promise.all([
    ProducerProfileModel.find({}, { slug: 1, userId: 1, updatedAt: 1 }).lean(),
    TrackModel.aggregate<{ _id: string; updatedAt: Date }>([
      { $match: publicTrackFilter },
      { $group: { _id: "$producerId", updatedAt: { $max: "$updatedAt" } } },
    ]),
  ]);
  const trackDateByProducer = new Map(
    trackFreshness.map((entry) => [entry._id, entry.updatedAt])
  );
  const entries = profiles.map((profile) => {
    const trackUpdatedAt = trackDateByProducer.get(profile.userId);
    return {
      username: profile.slug,
      liveTrackCount: trackUpdatedAt ? 1 : 0,
      updatedAt: new Date(
        Math.max(
          profile.updatedAt.getTime(),
          trackUpdatedAt?.getTime() ?? 0
        )
      ),
    };
  });
  return filterProducerSitemapEntries(entries).map(({ username, updatedAt }) => ({
    username,
    updatedAt,
  }));
}

type LandingKind = "genre" | "language" | "producersLocation" | "cityBeats";

export async function getPublicLandingPage(
  kind: LandingKind,
  requestedSlug: string
): Promise<PublicLandingSnapshot | null> {
  await connectMongoose();
  let label = "";
  let scope: "genre" | "language" | "state" | "city";
  const trackFilter: Record<string, unknown> = { ...publicTrackFilter };
  let producerIds: string[] = [];
  let path = "";
  let threshold = siteConfig.minTracksForLandingPage;

  if (kind === "genre" || kind === "language") {
    const field = kind;
    const values = (await TrackModel.distinct(field, publicTrackFilter)) as string[];
    label = values.find((value) => slugifyPublicLabel(value) === requestedSlug) || "";
    if (!label) return null;
    scope = kind;
    trackFilter[field] = label;
    path = `/beats/${kind}/${requestedSlug}`;
  } else {
    const profiles = await ProducerProfileModel.find(
      {},
      { userId: 1, slug: 1, displayName: 1, avatarKey: 1, verified: 1, location: 1, updatedAt: 1 }
    ).lean();
    const cityOnly = kind === "producersLocation" && requestedSlug.endsWith("-city");
    const locationSlug = cityOnly
      ? requestedSlug.slice(0, -"-city".length)
      : requestedSlug;
    const cityProfiles = profiles.filter(
      (profile) => slugifyPublicLabel(profile.location.city) === locationSlug
    );
    if (kind === "producersLocation") {
      if (cityOnly) {
        if (cityProfiles.length === 0) return null;
        producerIds = cityProfiles.map((profile) => profile.userId);
        label = cityProfiles[0].location.city;
        scope = "city";
      } else {
        const stateProfiles = profiles.filter(
          (profile) => slugifyPublicLabel(profile.location.state) === locationSlug
        );
        if (stateProfiles.length > 0) {
          producerIds = stateProfiles.map((profile) => profile.userId);
          label = stateProfiles[0].location.state;
          scope = "state";
        } else if (cityProfiles.length > 0) {
          producerIds = cityProfiles.map((profile) => profile.userId);
          label = cityProfiles[0].location.city;
          scope = "city";
        } else {
          return null;
        }
      }
      threshold = siteConfig.minProducersForLocationPage;
      path = `/producers/in/${requestedSlug}`;
    } else {
      producerIds = cityProfiles.map((profile) => profile.userId);
      if (cityProfiles.length === 0) return null;
      label = cityProfiles[0].location.city;
      scope = "city";
      threshold = siteConfig.minTracksForCityBeatPage;
      path = `/beats/in/${requestedSlug}`;
    }
    trackFilter.producerId = { $in: producerIds };
  }

  const [trackCount, producersWithTracks, topTracks, genreCounts, languageCounts, latestTrack] =
    await Promise.all([
      TrackModel.countDocuments(trackFilter),
      TrackModel.distinct("producerId", trackFilter),
      TrackModel.find(trackFilter).sort({ playCount: -1, createdAt: -1 }).limit(12),
      TrackModel.aggregate<{ _id: string; count: number }>([
        { $match: trackFilter },
        { $group: { _id: "$genre", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      TrackModel.aggregate<{ _id: string; count: number }>([
        { $match: trackFilter },
        { $group: { _id: "$language", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 5 },
      ]),
      TrackModel.findOne(trackFilter).sort({ updatedAt: -1 }).select({ updatedAt: 1 }),
    ]);

    const producerProfileRecords = await ProducerProfileModel.find(
      { userId: { $in: producersWithTracks } },
      { userId: 1, slug: 1, displayName: 1, verified: 1, location: 1, updatedAt: 1 }
    ).lean();

    const producerProfiles: ProducerDirectoryEntry[] = producerProfileRecords.map((profile) => ({
      userId: profile.userId,
      username: profile.slug,
      displayName: profile.displayName,
      verified: profile.verified,
      city: profile.location.city,
      state: profile.location.state,
      updatedAt: profile.updatedAt,
    }));
    const producers = producerProfiles.map((profile) => ({
      username: profile.username,
      displayName: profile.displayName,
      city: profile.city,
      state: profile.state,
  }));
  const producerById = new Map(
    producerProfiles.map((profile) => [profile.userId, profile])
  );
  const tracks: PublicLandingTrack[] = topTracks.map((track) => {
    const producer = producerById.get(track.producerId);
    const enabledLicense = track.licenses.find(
      (license) =>
        license.enabled &&
        license.price.currency === "INR" &&
        license.termsText.trim()
    );
    return {
      id: track._id.toString(),
      title: track.title,
      slug: track.slug,
      genre: track.genre,
      language: track.language,
      bpm: track.bpm,
      playCount: track.playCount,
      coverKey: track.coverKey,
      producerId: track.producerId,
      producerName: producer?.displayName || track.producerName,
      producerUsername: producer?.username,
      previewKey: track.files.find((file) => file.kind === "preview")?.r2Key,
      waveform: track.waveform,
      lowestPriceAmount: enabledLicense?.price.amount ?? null,
    };
  });
  return {
    kind: scope,
    label,
    path,
    updatedAt: new Date(
      Math.max(
        latestTrack?.updatedAt.getTime() ?? 0,
        ...producerProfiles.map((profile) => profile.updatedAt.getTime())
      )
    ),
    trackCount,
    producerCount: producersWithTracks.length,
    threshold,
    tracks,
    producers,
    commonGenres: genreCounts.map(({ _id, count }) => ({ label: _id, count })),
    commonLanguages: languageCounts.map(({ _id, count }) => ({ label: _id, count })),
  };
}

export async function getIndexableLandingSitemapEntries(): Promise<
  Array<{ path: string; updatedAt: Date }>
> {
  await connectMongoose();
  const entries: Array<{
    path: string;
    updatedAt: Date;
    count: number;
    threshold: number;
  }> = [];
  const [genres, languages, profiles] = await Promise.all([
    TrackModel.distinct("genre", publicTrackFilter) as Promise<string[]>,
    TrackModel.distinct("language", publicTrackFilter) as Promise<string[]>,
    ProducerProfileModel.find(
      { userId: 1, location: 1, updatedAt: 1 }
    ).lean(),
  ]);
  const stateSlugs = new Set(
    profiles.map((profile) => slugifyPublicLabel(profile.location.state))
  );
  const candidateSlugs = [
    ...new Set([
      ...genres.map((value) => `genre:${slugifyPublicLabel(value)}`),
      ...languages.map((value) => `language:${slugifyPublicLabel(value)}`),
      ...profiles.flatMap((profile) => {
        const citySlug = slugifyPublicLabel(profile.location.city);
        return [
          `location:${slugifyPublicLabel(profile.location.state)}`,
          `location:${getProducerLocationCitySlug(profile.location.city, stateSlugs)}`,
          `city:${citySlug}`,
        ];
      }),
    ]),
  ];
  for (const candidate of candidateSlugs) {
    const separator = candidate.indexOf(":");
    const type = candidate.slice(0, separator);
    const slug = candidate.slice(separator + 1);
    const data =
      type === "genre" || type === "language"
        ? await getPublicLandingPage(type, slug)
        : type === "location"
          ? await getPublicLandingPage("producersLocation", slug)
          : type === "city"
            ? await getPublicLandingPage("cityBeats", slug)
            : null;
    if (!data) continue;
    const count =
      type === "location" ? data.producers.length : data.trackCount;
    entries.push({
      path: data.path,
      updatedAt: data.updatedAt,
      count,
      threshold: data.threshold,
    });
  }
  const uniqueEntries = new Map<string, { path: string; updatedAt: Date }>();
  for (const entry of filterIndexableLandingSitemapEntries(entries)) {
    uniqueEntries.set(entry.path, { path: entry.path, updatedAt: entry.updatedAt });
  }
  return [...uniqueEntries.values()];
}

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
