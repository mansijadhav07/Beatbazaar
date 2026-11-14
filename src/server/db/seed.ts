import dotenv from "dotenv";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getSeedDatabaseConfig } from "./seed-config";
import { provisionLocalAccount } from "./local-accounts";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

interface DemoBeat {
  title: string;
  slug: string;
  genre: string;
  bpm: number;
  key: string;
  assetNumber: string;
}

const demoBeats: DemoBeat[] = [
  {
    title: "Local Demo Rhythm 01",
    slug: "local-demo-rhythm-01",
    genre: "Trap",
    bpm: 110,
    key: "A Minor",
    assetNumber: "01",
  },
  {
    title: "Local Demo Rhythm 02",
    slug: "local-demo-rhythm-02",
    genre: "Hip Hop",
    bpm: 147,
    key: "D Minor",
    assetNumber: "02",
  },
  {
    title: "Local Demo Rhythm 03",
    slug: "local-demo-rhythm-03",
    genre: "Electronic",
    bpm: 196,
    key: "G Minor",
    assetNumber: "03",
  },
];

function createDemoPassword(): string {
  return randomBytes(18).toString("base64url");
}

async function runSeed(): Promise<void> {
  const { uri, databaseName } = getSeedDatabaseConfig(process.env);
  process.env.MONGODB_URI = uri;

  const [
    { connectToDatabase },
    { TrackModel },
    { ProducerProfileModel },
    { extractWaveformPeaks },
    mongoClientPromise,
  ] =
    await Promise.all([
      import("./mongoose"),
      import("./models/Track"),
      import("./models/ProducerProfile"),
      import("../audio/transcoder"),
      import("./mongodb"),
    ]);

  const passwordByRole = {
    admin: createDemoPassword(),
    producer: createDemoPassword(),
    buyer: createDemoPassword(),
  };

  console.log(`Connecting to isolated test database "${databaseName}" for local seed execution...`);
  const mongoose = await connectToDatabase();
  const mongoClient = await mongoClientPromise.default;

  try {
    const db = mongoClient.db(databaseName);
    const accounts = await Promise.all([
      provisionLocalAccount(db, {
        email: "admin@beatbazaar.test",
        name: "Local Demo Admin",
        role: "admin",
        password: passwordByRole.admin,
      }),
      provisionLocalAccount(db, {
        email: "producer@beatbazaar.test",
        name: "Local Demo Producer",
        role: "producer",
        password: passwordByRole.producer,
      }),
      provisionLocalAccount(db, {
        email: "buyer@beatbazaar.test",
        name: "Local Demo Buyer",
        role: "buyer",
        password: passwordByRole.buyer,
      }),
    ]);
    const [, producerId] = accounts;

    await ProducerProfileModel.findOneAndUpdate(
      { userId: producerId },
      {
        $set: {
          slug: "local-demo-producer",
          displayName: "Local Demo Producer",
          bio: "A local-only profile used to check the producer page and catalog flows.",
          avatarKey: "local-demo/local-demo-01.svg",
          location: { country: "India", state: "Maharashtra", city: "Mumbai" },
          verified: false,
        },
        $setOnInsert: { followerCount: 0 },
      },
      { upsert: true, new: true, runValidators: true }
    );

    for (const beat of demoBeats) {
      const filePath = path.join(
        process.cwd(),
        "public",
        "demo",
        `local-demo-${beat.assetNumber}.mp3`
      );
      const audio = await fs.readFile(filePath);
      const checksum = createHash("sha256").update(audio).digest("hex");
      const waveform = await extractWaveformPeaks(filePath, 120);
      await TrackModel.findOneAndUpdate(
        { producerId, slug: beat.slug },
        {
          $set: {
            producerId,
            producerName: "Local Demo Producer",
            title: beat.title,
            slug: beat.slug,
            genre: beat.genre,
            language: "Instrumental",
            bpm: beat.bpm,
            key: beat.key,
            moods: ["local demo"],
            tags: ["local-demo"],
            coverKey: `local-demo/local-demo-${beat.assetNumber}.svg`,
            status: "live",
            processingStatus: "ready",
            processingError: null,
            waveform,
            playCount: 0,
            featured: false,
            rightsConfirmedAt: new Date(),
            files: [
              {
                kind: "preview",
                r2Key: `local-demo/local-demo-${beat.assetNumber}.mp3`,
                size: audio.byteLength,
                checksum,
                mimeType: "audio/mpeg",
              },
            ],
            licenses: [
              {
                tier: "free",
                name: "Local demo preview",
                price: { amount: 0, currency: "INR" },
                includedFiles: ["preview"],
                termsText:
                  "Local test fixture only. This generated preview is not a commercial license.",
                termsVersion: "local-demo-1",
                enabled: true,
              },
              {
                tier: "non_exclusive",
                name: "Local demo non-exclusive",
                price: { amount: 25000, currency: "INR" },
                includedFiles: ["preview"],
                termsText:
                  "Local test fixture only. Original licensed delivery requires configured private storage.",
                termsVersion: "local-demo-1",
                enabled: true,
              },
              {
                tier: "exclusive",
                name: "Local demo exclusive",
                price: { amount: 250000, currency: "INR" },
                includedFiles: ["preview"],
                termsText:
                  "Local test fixture only. Original licensed delivery requires configured private storage.",
                termsVersion: "local-demo-1",
                enabled: true,
              },
            ],
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    const trackCount = await TrackModel.countDocuments({ producerId, status: "live" });
    console.log(`Seeded 3 local demo accounts and ${trackCount} live demo beats.`);
    console.log("Generated credentials, shown once. Save them before closing this terminal:");
    console.log(`Admin:    admin@beatbazaar.test / ${passwordByRole.admin}`);
    console.log(`Producer: producer@beatbazaar.test / ${passwordByRole.producer}`);
    console.log(`Buyer:    buyer@beatbazaar.test / ${passwordByRole.buyer}`);
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
