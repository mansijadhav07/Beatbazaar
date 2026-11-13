import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

console.log("[Beatbazaar Worker] Starting background worker runtime...");
console.log("[Beatbazaar Worker] Queue listener: idle (ready for Phase 2 audio transcoding tasks).");

const interval = setInterval(() => {
  console.log(`[Beatbazaar Worker] Heartbeat: ${new Date().toISOString()}`);
}, 60000);

function handleShutdown(signal: string) {
  console.log(`[Beatbazaar Worker] Received ${signal}. Shutting down worker gracefully...`);
  clearInterval(interval);
  process.exit(0);
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

