import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function runSeed() {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: db:seed is strictly forbidden in production environment.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set before running db:seed.");
  }
  if (uri === process.env.MONGODB_TEST_URI) {
    throw new Error("db:seed cannot run against MONGODB_TEST_URI.");
  }

  const parsedUri = new URL(
    uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")
  );
  const databaseName = decodeURIComponent(parsedUri.pathname.slice(1));
  if (!databaseName) {
    throw new Error("MONGODB_URI must include an explicit database name.");
  }

  const [{ connectToDatabase }, { TrackModel }, { ProducerProfileModel }] =
    await Promise.all([
      import("./mongoose"),
      import("./models/Track"),
      import("./models/ProducerProfile"),
    ]);

  console.log(`Connecting to database "${databaseName}" for seed execution...`);
  await connectToDatabase();

  console.log("Validating existing collections...");
  const trackCount = await TrackModel.countDocuments();
  const producerCount = await ProducerProfileModel.countDocuments();

  console.log(`Current state: ${trackCount} tracks, ${producerCount} producer profiles.`);
  console.log("Database seed completed successfully with zero synthetic reviews or fake metrics.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Seed execution failed:", err);
  process.exit(1);
});
