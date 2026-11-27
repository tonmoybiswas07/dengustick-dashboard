import "server-only";

import { ObjectId, type ClientSession } from "mongodb";
import { regionsCollection } from "@/lib/collections";

export async function hasActiveRegion(user: { role?: string | null; regionId?: string | null }) {
  if (user.role === "admin") return true;
  if (!user.regionId || !ObjectId.isValid(user.regionId)) return false;
  return Boolean(await regionsCollection.findOne(
    { _id: new ObjectId(user.regionId), isActive: true },
    { projection: { _id: 1 } },
  ));
}

// Lifecycle writers must touch the same region document as deactivation.
// A write conflict forces MongoDB to retry with a fresh snapshot.
export async function lockRegion(session: ClientSession, id: string, activeOnly = true) {
  const result = await regionsCollection.updateOne(
    { _id: new ObjectId(id), ...(activeOnly && { isActive: true }) },
    { $inc: { lifecycleVersion: 1 } },
    { session },
  );
  return result.matchedCount === 1;
}
