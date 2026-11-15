import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/astrylix";

let databaseName = "astrylix";
try {
  const parsed = new URL(mongoUri.replace("mongodb+srv://", "http://").replace("mongodb://", "http://"));
  const pathname = parsed.pathname.replace(/^\//, "");
  if (pathname) {
    databaseName = pathname;
  }
} catch {
  // Use default databaseName
}

export const mongodb = {
  url: mongoUri,
  databaseName: databaseName,
  options: {},
};

export const migrationsDir = "migrations";
export const changelogCollectionName = "changelog";
export const migrationFileExtension = ".js";
export const useFileHash = false;
export const moduleSystem = "esm";

const config = {
  mongodb,
  migrationsDir,
  changelogCollectionName,
  migrationFileExtension,
  useFileHash,
  moduleSystem,
};

export default config;
