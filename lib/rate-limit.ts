import "server-only";

import { MongoServerError } from "mongodb";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

export async function rateLimit(scope: string, subject: string, max: number, seconds = 60) {
  const interval = Math.ceil(seconds * 1000 / max);
  const burst = Math.max(1, Math.ceil(max / 4));
  const key = createHmac("sha256", process.env.BETTER_AUTH_SECRET || "development-rate-limits-v2")
    .update(JSON.stringify(["v2", scope, subject])).digest("hex");

  try {
    const collection = db.collection<{ _id: string; allowed: boolean; retryMs: number }>("request_limits");
    // MongoDB's clock and a single update serialize continuously replenished capacity.
    const update = [
      { $set: { nextAt: { $ifNull: ["$nextAt", "$$NOW"] } } },
      { $set: { retryMs: { $max: [0, { $subtract: [{ $subtract: ["$nextAt", "$$NOW"] }, (burst - 1) * interval] }] } } },
      { $set: {
        allowed: { $eq: ["$retryMs", 0] },
        nextAt: { $cond: [{ $eq: ["$retryMs", 0] }, { $add: [{ $max: ["$nextAt", "$$NOW"] }, interval] }, "$nextAt"] },
      } },
      { $set: { expiresAt: "$nextAt" } },
    ];
    const record = await collection.findOneAndUpdate({ _id: key }, update, {
      upsert: true, returnDocument: "after",
    }).catch((error: unknown) => {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      return collection.findOneAndUpdate({ _id: key }, update, { returnDocument: "after" });
    });
    if (!record) throw new Error("Rate limit record was unavailable");
    if (record.allowed) return null;
    return Response.json({ message: "Too many requests. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil(record.retryMs / 1000))) },
    });
  } catch {
    return Response.json({ message: "Request protection is temporarily unavailable" }, { status: 503 });
  }
}
