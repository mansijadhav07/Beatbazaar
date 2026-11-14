export interface SeedDatabaseConfig {
  uri: string;
  databaseName: string;
}

export function getSeedDatabaseConfig(
  env: {
    NODE_ENV?: string;
    MONGODB_URI?: string;
    MONGODB_TEST_URI?: string;
  }
): SeedDatabaseConfig {
  if (env.NODE_ENV === "production") {
    throw new Error("db:seed is not allowed in production.");
  }

  const uri = env.MONGODB_TEST_URI;
  if (!uri) {
    throw new Error("MONGODB_TEST_URI must point to an isolated test database.");
  }
  if (uri === env.MONGODB_URI) {
    throw new Error("MONGODB_TEST_URI must be different from MONGODB_URI.");
  }

  let databaseName: string;
  try {
    const parsed = new URL(
      uri.replace(/^mongodb\+srv:/, "https:").replace(/^mongodb:/, "http:")
    );
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error("MONGODB_TEST_URI is not a valid MongoDB URI.");
  }

  if (!databaseName || !/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error("MONGODB_TEST_URI database name must contain test.");
  }

  return { uri, databaseName };
}
