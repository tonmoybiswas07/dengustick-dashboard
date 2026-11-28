import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { MongoClient, ServerApiVersion } from "mongodb";

import { describeStagingError, StagingError } from "./staging-auth-errors.mjs";

export const stagingDatabase = "DengueStickStagingDB";
export { StagingError };

export function stagingConfig(args = process.argv.slice(2), { readOnly = false } = {}) {
  if (process.env.NODE_ENV === "production" || !args.includes(readOnly ? "--check" : "--allow-staging-writes")) {
    throw new StagingError(readOnly
      ? "Run --check outside production."
      : "Use an approved staging run with --allow-staging-writes outside production.", "environment");
  }

  let local = {};
  try {
    local = parseEnv(readFileSync(new URL("../.env.staging.local", import.meta.url), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw new StagingError("Could not read .env.staging.local.", "environment");
  }

  const read = (name) => process.env[name] ?? local[name];
  const uri = read("STAGING_MONGODB_URI");
  const secret = read("STAGING_BETTER_AUTH_SECRET");
  if (read("STAGING_MONGODB_DB") !== stagingDatabase ||
      (process.env.MONGODB_DB && process.env.MONGODB_DB !== stagingDatabase)) {
    throw new StagingError("Explicitly select DengueStickStagingDB. Other database names are refused.", "environment");
  }
  if (!uri || !secret || secret.length < 32) {
    throw new StagingError("Set STAGING_MONGODB_URI and a staging-only STAGING_BETTER_AUTH_SECRET of at least 32 characters.", "environment");
  }

  let client;
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });
  } catch {
    throw new StagingError("The staging MongoDB URI is invalid.", "environment");
  }
  if (client.options.dbName !== stagingDatabase) {
    throw new StagingError("The MongoDB URI path must explicitly name DengueStickStagingDB.", "environment");
  }

  return {
    client, db: client.db(stagingDatabase), uri, secret,
    adminEmail: read("STAGING_AUTH_ADMIN_EMAIL"),
    adminPassword: read("STAGING_AUTH_ADMIN_PASSWORD"),
  };
}

export async function verifyStagingDatabase(config) {
  const collections = await config.db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(collections.map(({ name }) => name));
  if (!["user", "account", "session", "request_limits"].every((name) => names.has(name))) {
    throw new StagingError("Expected staging collections are missing. Confirm the staging cluster and migration.", "environment");
  }
  const indexes = await config.db.collection("user").listIndexes().toArray();
  if (!indexes.some(({ key, unique, partialFilterExpression, sparse }) =>
    unique && !partialFilterExpression && !sparse && key.email === 1 && Object.keys(key).length === 1)) {
    throw new StagingError("A non-partial unique user email index is required on staging.");
  }
}

export function reportStagingError(error, fallback, phase) {
  console.error(describeStagingError(error, phase) ?? fallback);
  process.exitCode = 1;
}
