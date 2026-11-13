import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { connectMongoose } from "../src/server/db/mongoose";
import { TrackModel } from "../src/server/db/models/Track";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("This script can only be run in development environments.");
    process.exit(1);
  }

  const trackId = process.argv[2];
  if (!trackId) {
    console.log("Usage: npx tsx scripts/approve-track.ts <trackId>");
    process.exit(1);
  }

  await connectMongoose();
  const track = await TrackModel.findById(trackId);
  if (!track) {
    console.error(`Track ${trackId} not found.`);
    process.exit(1);
  }

  track.status = "live";
  await track.save();

  console.log(`Track "${track.title}" (${track._id}) is now LIVE.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

