import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI for the intended database.");
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db(process.env.MONGODB_DB || "DengueStickDB");
const indexes = {
  inspections: [
    [{ inspectionId: 1 }, { unique: true }],
    [{ inspectedAt: -1, _id: -1 }],
    [{ createdAt: -1, _id: -1 }],
    [{ regionId: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, inspectorId: 1, createdAt: -1, _id: -1 }],
    [{ status: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, status: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, inspectedAt: -1, _id: -1 }],
    [{ regionId: 1, inspectorId: 1, inspectedAt: -1 }],
    [{ status: 1, "review.verifiedDetectionResult": 1, regionId: 1 }],
  ],
  field_tasks: [
    [{ taskId: 1 }, { unique: true }],
    [{ createdAt: -1, _id: -1 }],
    [{ regionId: 1, createdAt: -1, _id: -1 }],
    [{ assignedTo: 1, regionId: 1 }],
    [{ status: 1, deadline: 1 }],
    [{ regionId: 1, assignedTo: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, status: 1, deadline: 1 }],
    [{ inspectionId: 1 }, { unique: true, partialFilterExpression: { inspectionId: { $type: "string" } } }],
  ],
  alerts: [
    [{ sourceId: 1, sourceType: 1 }],
    [{ createdAt: -1, _id: -1 }],
    [{ regionId: 1, createdAt: -1, _id: -1 }],
    [{ type: 1, sourceId: 1 }, { unique: true }],
    [{ regionId: 1, status: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, assignedTo: 1, createdAt: -1, _id: -1 }],
  ],
  reports: [
    [{ reportId: 1 }, { unique: true }],
    [{ createdAt: -1, _id: -1 }],
    [{ regionId: 1, createdAt: -1, _id: -1 }],
    [{ regionId: 1, generatedBy: 1, createdAt: -1, _id: -1 }],
  ],
  regions: [[{ code: 1 }, { unique: true }], [{ isActive: 1, name: 1 }], [{ name: 1, _id: 1 }]],
  user: [[{ email: 1 }, { unique: true }], [{ regionId: 1, role: 1, banned: 1 }], [{ regionId: 1, banned: 1 }], [{ role: 1, name: 1, _id: 1 }], [{ regionId: 1, role: 1, name: 1, _id: 1 }], [{ createdAt: -1, _id: -1 }]],
  session: [[{ token: 1 }, { unique: true }], [{ userId: 1 }], [{ userId: 1, expiresAt: 1 }]],
  account: [[{ userId: 1 }], [{ userId: 1, providerId: 1 }]],
  verification: [[{ identifier: 1 }]],
  audit_logs: [[{ timestamp: -1, _id: -1 }], [{ action: 1, timestamp: -1, _id: -1 }], [{ actorId: 1, timestamp: -1, _id: -1 }]],
  request_limits: [[{ expiresAt: 1 }, { expireAfterSeconds: 0 }]],
};

try {
  for (const [name, specs] of Object.entries(indexes)) {
    const collection = db.collection(name);
    const existing = await collection.listIndexes().toArray().catch((error) => {
      if (error.code === 26) return [];
      throw error;
    });
    for (const [key, options = {}] of specs) {
      const matching = existing.filter((index) => JSON.stringify(index.key) === JSON.stringify(key));
      const equivalent = matching.some((index) =>
        Boolean(index.unique) === Boolean(options.unique) &&
        !index.sparse && !index.collation && !index.hidden &&
        index.expireAfterSeconds === options.expireAfterSeconds &&
        JSON.stringify(index.partialFilterExpression) === JSON.stringify(options.partialFilterExpression),
      );
      if (equivalent) continue;
      if (matching.length) throw new Error(`Review existing index ${name}.${matching[0].name} before continuing.`);
      try {
        await collection.createIndex(key, options);
      } catch (error) {
        throw new Error(`Index creation stopped at ${name} (${Object.keys(key).join(", ")}), MongoDB code ${error.code ?? "unknown"}.`);
      }
    }
    console.log(`Indexes verified for ${name}`);
  }
} catch (error) {
  console.error(error.code ? `MongoDB index check failed with code ${error.code}.` : error.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
