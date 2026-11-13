import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { connectToDatabase } from "./mongoose";
import { TrackModel } from "./models/Track";
import { ProducerProfileModel } from "./models/ProducerProfile";

async function runSeed() {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: db:seed is strictly forbidden in production environment.");
    process.exit(1);
  }

  console.log("Connecting to database for seed execution...");
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

