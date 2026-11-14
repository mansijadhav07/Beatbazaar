import { defineConfig } from "vitest/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const applicationMongoUri = process.env.MONGODB_URI;
if (
  process.env.MONGODB_TEST_URI &&
  applicationMongoUri === process.env.MONGODB_TEST_URI
) {
  throw new Error("Vitest requires MONGODB_TEST_URI to differ from MONGODB_URI.");
}
if (process.env.MONGODB_TEST_URI) {
  process.env.MONGODB_APPLICATION_URI = applicationMongoUri;
  process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;
}

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
