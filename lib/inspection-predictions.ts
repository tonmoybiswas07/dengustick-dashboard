import "server-only";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { audit } from "@/lib/audit";
import client from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { inspectionsCollection, usersCollection } from "@/lib/collections";
import { getImageStorage } from "@/lib/cloudinary-images";
import { boundedImageBytes } from "@/lib/image-intake";
import { getInferenceService, InferenceError } from "@/lib/inference";
import { inspectionImageId } from "@/lib/inspection-image-reference.mjs";
import { inspectionImages } from "@/lib/inspection-images";
import { maxPredictionAttempts, type InspectionPredictionJob } from "@/lib/inspection-prediction-state";
import { hasActiveRegion } from "@/lib/region-security";

export function predictionConfigured() {
  try {
    return (process.env.INFERENCE_WORKER_SECRET?.length ?? 0) >= 32 &&
      !!process.env.INFERENCE_HEALTH_PATH && !!getImageStorage() && !!getInferenceService();
  } catch {
    return false;
  }
}

export async function getPredictionServices() {
  const inference = getInferenceService();
  const storage = getImageStorage();
  if (!inference || !storage || await inference.health() !== "available") return null;
  return { inference, storage };
}

export async function processPrediction(services: NonNullable<Awaited<ReturnType<typeof getPredictionServices>>>) {
  const now = new Date();
  const eligible = { status: { $in: ["pending", "under_review"] as ("pending" | "under_review")[] }, prediction: { $exists: false } };
  await inspectionsCollection.updateMany({
    ...eligible, "predictionJob.status": "processing",
    "predictionJob.leaseUntil": { $lte: now }, "predictionJob.attempts": { $gte: maxPredictionAttempts },
  }, {
    $set: { "predictionJob.status": "failed", "predictionJob.failure": "attempt_limit", "predictionJob.finishedAt": now },
    $unset: { "predictionJob.leaseId": "", "predictionJob.leaseUntil": "" },
  });
  const leaseId = randomUUID();
  const inspection = await inspectionsCollection.findOneAndUpdate({
    ...eligible,
    "predictionJob.attempts": { $lt: maxPredictionAttempts },
    $or: [
      { "predictionJob.status": "pending" },
      { "predictionJob.status": "processing", "predictionJob.leaseUntil": { $lte: now } },
    ],
  }, {
    $inc: { "predictionJob.attempts": 1 },
    $set: { "predictionJob.status": "processing", "predictionJob.leaseId": leaseId, "predictionJob.leaseUntil": new Date(now.getTime() + 120_000) },
  }, { sort: { "predictionJob.queuedAt": 1 }, returnDocument: "after" });

  if (!inspection?.predictionJob) return "idle";
  const job = inspection.predictionJob;
  const fence = { ...eligible, _id: inspection._id, "predictionJob.leaseId": leaseId };
  const id = inspectionImageId(job.imageUrl);
  let failure: InspectionPredictionJob["failure"] = "evidence";

  try {
    if (!id || !inspection.images.includes(job.imageUrl) || !(await hasActiveRegion({ regionId: inspection.regionId }))) {
      throw new Error("Evidence unavailable");
    }
    const requester = ObjectId.isValid(job.requestedBy)
      ? await usersCollection.findOne({ _id: new ObjectId(job.requestedBy), banned: { $ne: true } }, { projection: { role: 1, regionId: 1 } })
      : null;
    if (!requester || !hasPermission(requester.role, "ai:review") ||
        (requester.role !== "admin" && requester.regionId !== inspection.regionId)) throw new Error("Requester access changed");
    const image = await inspectionImages.findOne({ _id: new ObjectId(id), status: "ready", inspectionId: inspection._id });
    if (!image?.version) throw new Error("Evidence unavailable");
    const content = await boundedImageBytes(await services.storage.get(image.publicId, image.version));
    failure = "service";
    const prediction = await services.inference.predict({ bytes: content, type: "image/webp" }, job.requestId);
    return await client.withSession((session) => session.withTransaction(async () => {
      const result = await inspectionsCollection.updateOne(fence, {
        $set: {
          prediction, detectionResult: prediction.result, larvaeCount: prediction.larvaeCount, confidenceScore: prediction.confidence,
          "predictionJob.status": "completed", "predictionJob.finishedAt": new Date(), updatedAt: new Date(),
        },
        $unset: { "predictionJob.leaseId": "", "predictionJob.leaseUntil": "", "predictionJob.failure": "" },
      }, { session });
      if (!result.matchedCount) return "lease_lost";
      await audit({ actorId: job.requestedBy, action: "inspection.prediction.completed", resource: "inspection",
        resourceId: inspection._id.toHexString(), regionId: inspection.regionId }, session);
      return "completed";
    }));
  } catch (error) {
    if (error instanceof InferenceError && error.code === "invalid_response") failure = "invalid_response";
    return await client.withSession((session) => session.withTransaction(async () => {
      const result = await inspectionsCollection.updateOne(fence, {
        $set: { "predictionJob.status": "failed", "predictionJob.failure": failure, "predictionJob.finishedAt": new Date() },
        $unset: { "predictionJob.leaseId": "", "predictionJob.leaseUntil": "" },
      }, { session });
      if (!result.matchedCount) return "lease_lost";
      await audit({ actorId: job.requestedBy, action: "inspection.prediction.failed", resource: "inspection",
        resourceId: inspection._id.toHexString(), regionId: inspection.regionId }, session);
      return "failed";
    }));
  }
}
