import "server-only";

import { ObjectId, type ClientSession } from "mongodb";
import { db } from "@/lib/db";
import { inspectionImageId } from "@/lib/inspection-image-reference.mjs";
import type { InspectionImageStorage } from "@/lib/image-intake";

export const inspectionImages = db.collection<{
  ownerId: string;
  regionId: string;
  publicId: string;
  bytes: number;
  version?: number;
  status: "uploading" | "ready" | "deleting";
  inspectionId?: ObjectId;
  expiresAt?: Date;
  createdAt: Date;
}>("inspection_images");

export class UnavailableInspectionImage extends Error {}

export async function syncInspectionImages(
  inspectionId: ObjectId,
  images: string[],
  actorId: string,
  regionId: string,
  session: ClientSession,
  detach = true,
) {
  const ids = [...new Set(images.map(inspectionImageId).filter((id): id is string => !!id))]
    .map((id) => new ObjectId(id));
  const now = new Date();
  for (const _id of ids) {
    const result = await inspectionImages.updateOne({
      _id, status: "ready",
      $or: [
        { inspectionId },
        { inspectionId: { $exists: false }, ownerId: actorId, regionId, expiresAt: { $gt: now } },
      ],
    }, { $set: { inspectionId, regionId }, $unset: { expiresAt: "" } }, { session });
    if (!result.matchedCount) throw new UnavailableInspectionImage();
  }
  if (!detach) return;
  await inspectionImages.updateMany(
    { inspectionId, _id: { $nin: ids } },
    { $unset: { inspectionId: "" }, $set: { status: "deleting", expiresAt: now } },
    { session },
  );
}

export async function removeExpiredImages(storage: InspectionImageStorage) {
  const filter = { inspectionId: { $exists: false }, expiresAt: { $lte: new Date() } };
  const candidates = await inspectionImages.find(filter).sort({ expiresAt: 1 }).limit(5).toArray();
  let removed = 0;
  for (const candidate of candidates) {
    const leaseUntil = new Date(Date.now() + 60_000);
    const record = await inspectionImages.findOneAndUpdate(
      { ...filter, _id: candidate._id },
      { $set: { status: "deleting", expiresAt: leaseUntil } },
    );
    if (!record) continue;
    try {
      await storage.remove(record.publicId);
      const result = await inspectionImages.deleteOne({ _id: record._id, status: "deleting", expiresAt: leaseUntil });
      removed += result.deletedCount;
    } catch {
      // Keep the identifier for a later cleanup attempt.
    }
  }
  return { attempted: candidates.length, removed };
}
