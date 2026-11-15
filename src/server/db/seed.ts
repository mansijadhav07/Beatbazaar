import dotenv from "dotenv";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getSeedDatabaseConfig } from "./seed-config";
import { provisionLocalAccount } from "./local-accounts";
import { demoBeats, demoProducer } from "./seed-data";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const skipIfSeeded = process.argv.includes("--if-empty");
// Catalog-only mode targets MONGODB_URI (the live site database) and creates no login accounts.
const catalogOnly = process.argv.includes("--catalog-only");
// The three bundled preview clips are reused across the demo beats.
const previewFiles = ["01", "02", "03"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createDemoPassword(): string {
  return randomBytes(18).toString("base64url");
}

async function runSeed(): Promise<void> {
  let uri: string;
  let databaseName: string;
  if (catalogOnly) {
    if (process.env.ALLOW_CATALOG_SEED !== "yes") {
      throw new Error("Set ALLOW_CATALOG_SEED=yes to seed the catalog into MONGODB_URI.");
    }
    uri = process.env.MONGODB_URI ?? "";
    if (!uri) throw new Error("MONGODB_URI is not set.");
    databaseName = decodeURIComponent(
      new URL(uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")).pathname.slice(1)
    );
  } else {
    ({ uri, databaseName } = getSeedDatabaseConfig(process.env));
  }
  process.env.MONGODB_URI = uri;

  const [
    { connectToDatabase },
    { TrackModel },
    { ProducerProfileModel },
    { PlayEventModel },
    { extractWaveformPeaks },
    mongoClientPromise,
  ] = await Promise.all([
    import("./mongoose"),
    import("./models/Track"),
    import("./models/ProducerProfile"),
    import("./models/PlayEvent"),
    import("../audio/transcoder"),
    import("./mongodb"),
  ]);

  console.log(`Connecting to database "${databaseName}" for ${catalogOnly ? "catalog" : "local"} seed execution...`);
  const mongoose = await connectToDatabase();
  const mongoClient = await mongoClientPromise.default;

  try {
    if (skipIfSeeded && (await TrackModel.countDocuments({ status: "live" })) > 0) {
      console.log("Database already has live beats. Skipping demo seed.");
      return;
    }

    const passwordByRole = {
      admin: createDemoPassword(),
      producer: createDemoPassword(),
      buyer: createDemoPassword(),
    };
    const db = mongoClient.db(databaseName);
    let producerId: string;
    if (catalogOnly) {
      // The producer owns the catalog but gets no password, so no shared login exists on the live site.
      const now = new Date();
      const existing = await db.collection("user").findOne({ email: demoProducer.email });
      const result = await db.collection("user").findOneAndUpdate(
        { email: demoProducer.email },
        {
          $set: { name: demoProducer.accountName, role: "producer", emailVerified: true, updatedAt: now },
          $setOnInsert: { createdAt: now, image: null },
        },
        { upsert: true, returnDocument: "after" }
      );
      producerId = String(existing?._id ?? result?._id);
    } else {
      const accounts = await Promise.all([
        provisionLocalAccount(db, {
          email: "admin@astrylix.test",
          name: "Local Demo Admin",
          role: "admin",
          password: passwordByRole.admin,
        }),
        provisionLocalAccount(db, {
          email: demoProducer.email,
          name: demoProducer.accountName,
          role: "producer",
          password: passwordByRole.producer,
        }),
        provisionLocalAccount(db, {
          email: "buyer@astrylix.test",
          name: "Local Demo Buyer",
          role: "buyer",
          password: passwordByRole.buyer,
        }),
      ]);
      producerId = accounts[1];
    }

    await ProducerProfileModel.findOneAndUpdate(
      { userId: producerId },
      {
        $set: {
          slug: demoProducer.slug,
          displayName: demoProducer.displayName,
          bio: demoProducer.bio,
          avatarKey: "local-demo/beat-01.jpg",
          location: demoProducer.location,
          verified: true,
        },
        $setOnInsert: { followerCount: 0 },
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Remove the earlier three-beat fixtures so the catalog holds only the current demo set.
    await TrackModel.deleteMany({ producerId, slug: /^local-demo-rhythm-/ });

    const clips = await Promise.all(
      previewFiles.map(async (number) => {
        const filePath = path.join(process.cwd(), "public", "demo", `local-demo-${number}.mp3`);
        const audio = await fs.readFile(filePath);
        return {
          number,
          size: audio.byteLength,
          checksum: createHash("sha256").update(audio).digest("hex"),
          waveform: await extractWaveformPeaks(filePath, 120),
        };
      })
    );

    const hourBucket = new Date();
    hourBucket.setMinutes(0, 0, 0);

    for (const [index, beat] of demoBeats.entries()) {
      const number = String(index + 1).padStart(2, "0");
      const clip = clips[index % clips.length];
      const slug = slugify(beat.title);
      const termsNote =
        "Demo data for local development. Replace with reviewed license terms before launch. LEGAL REVIEW REQUIRED.";
      const licenses = [
        ...(beat.freeLicense
          ? [
              {
                tier: "free" as const,
                name: "Free listen and share",
                price: { amount: 0, currency: "INR" },
                includedFiles: ["preview"],
                termsText: `${termsNote} Credit the producer in the title or description.`,
                termsVersion: "demo-1",
                enabled: true,
              },
            ]
          : []),
        {
          tier: "non_exclusive" as const,
          name: "Non-exclusive",
          price: { amount: beat.nonExclusivePaise, currency: "INR" },
          includedFiles: ["preview"],
          termsText: termsNote,
          termsVersion: "demo-1",
          enabled: true,
        },
        {
          tier: "exclusive" as const,
          name: "Exclusive",
          price: { amount: beat.exclusivePaise, currency: "INR" },
          includedFiles: ["preview"],
          termsText: termsNote,
          termsVersion: "demo-1",
          enabled: true,
        },
      ];

      const track = await TrackModel.findOneAndUpdate(
        { producerId, slug },
        {
          $set: {
            producerId,
            producerName: demoProducer.displayName,
            title: beat.title,
            slug,
            genre: beat.genre,
            language: beat.language,
            bpm: beat.bpm,
            key: beat.key,
            moods: beat.moods,
            tags: beat.tags,
            coverKey: `local-demo/beat-${number}.jpg`,
            status: "live",
            processingStatus: "ready",
            processingError: null,
            waveform: clip.waveform,
            playCount: beat.plays,
            featured: beat.featured,
            rightsConfirmedAt: new Date(),
            files: [
              {
                kind: "preview",
                r2Key: `local-demo/local-demo-${clip.number}.mp3`,
                size: clip.size,
                checksum: clip.checksum,
                mimeType: "audio/mpeg",
              },
            ],
            licenses,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      await PlayEventModel.findOneAndUpdate(
        { trackId: track._id.toString(), hourBucket },
        { $set: { playCount: Math.max(1, Math.round(beat.plays / 40)) } },
        { upsert: true }
      );
    }

    const trackCount = await TrackModel.countDocuments({ producerId, status: "live" });
    if (catalogOnly) {
      console.log(`Seeded the Astrylix producer profile and ${trackCount} live beats. No login accounts were created.`);
      return;
    }
    console.log(`Seeded 3 local demo accounts and ${trackCount} live demo beats.`);
    console.log("Generated credentials, shown once. Save them before closing this terminal:");
    console.log(`Admin:    admin@astrylix.test / ${passwordByRole.admin}`);
    console.log(`Producer: ${demoProducer.email} / ${passwordByRole.producer}`);
    console.log(`Buyer:    buyer@astrylix.test / ${passwordByRole.buyer}`);
  } finally {
    await mongoose.disconnect();
    await mongoClient.close();
  }
}

runSeed().catch((error: unknown) => {
  console.error(
    "Seed execution failed:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exitCode = 1;
});
