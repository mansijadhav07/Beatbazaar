import { describe, expect, it } from "vitest";
import { getSeedDatabaseConfig } from "./seed-config";

describe("getSeedDatabaseConfig", () => {
  const baseEnv = {
    NODE_ENV: "development",
    MONGODB_URI: "mongodb://localhost:27017/app_database",
    MONGODB_TEST_URI: "mongodb://localhost:27017/test_database",
  };

  it("only selects a distinct test-named database", () => {
    expect(getSeedDatabaseConfig(baseEnv)).toEqual({
      uri: baseEnv.MONGODB_TEST_URI,
      databaseName: "test_database",
    });
  });

  it("refuses production", () => {
    expect(() =>
      getSeedDatabaseConfig({ ...baseEnv, NODE_ENV: "production" })
    ).toThrow("not allowed in production");
  });

  it("refuses missing or application database URIs", () => {
    expect(() =>
      getSeedDatabaseConfig({ ...baseEnv, MONGODB_TEST_URI: "" })
    ).toThrow("MONGODB_TEST_URI");
    expect(() =>
      getSeedDatabaseConfig({
        ...baseEnv,
        MONGODB_TEST_URI: baseEnv.MONGODB_URI,
      })
    ).toThrow("must be different");
  });

  it("refuses a database name without a test marker", () => {
    expect(() =>
      getSeedDatabaseConfig({
        ...baseEnv,
        MONGODB_URI: "mongodb://localhost:27017/other_app",
        MONGODB_TEST_URI: "mongodb://localhost:27017/app_database",
      })
    ).toThrow("database name must contain test");
  });
});
