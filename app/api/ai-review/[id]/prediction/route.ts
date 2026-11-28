import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import client from "@/lib/db";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";
import { inspectionImageId } from "@/lib/inspection-image-reference.mjs";
import { getPredictionServices } from "@/lib/inspection-predictions";
import { maxPredictionAttempts } from "@/lib/inspection-prediction-state";
import { audit } from "@/lib/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await authorizeAPI("ai:review", request);
    if (error) return error;
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return Response.json({ message: "Invalid inspection identifier" }, { status: 400 });
    const scope = getInspectionFilter(session.user);
    const filter = { ...scope, _id: new ObjectId(id) };
    const inspection = scope && await inspectionsCollection.findOne(filter);
    if (!inspection) return Response.json({ message: "Inspection unavailable" }, { status: 404 });
    if (inspection.predictionJob?.status === "pending" || inspection.predictionJob?.status === "processing") {
      return Response.json({ status: inspection.predictionJob.status }, { status: 202 });
    }
    const previous = inspection.predictionJob;
    if (inspection.prediction || previous?.status === "completed" || (previous?.attempts ?? 0) >= maxPredictionAttempts ||
        !["pending", "under_review"].includes(inspection.status)) {
      return Response.json({ message: "Prediction cannot be queued for this inspection" }, { status: 409 });
    }
    const imageUrl = inspection.images.find(inspectionImageId);
    if (!imageUrl) return Response.json({ message: "Upload managed evidence before requesting a prediction" }, { status: 409 });
    if ((process.env.INFERENCE_WORKER_SECRET?.length ?? 0) < 32 || !(await getPredictionServices())) return Response.json({ message: "Prediction services are unavailable" }, { status: 503 });

    const accepted = await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const update = await inspectionsCollection.updateOne({
        ...filter, updatedAt: inspection.updatedAt, status: inspection.status, prediction: { $exists: false },
        ...(previous
          ? { "predictionJob.requestId": previous.requestId, "predictionJob.status": "failed", "predictionJob.attempts": previous.attempts }
          : { predictionJob: { $exists: false } }),
      }, { $set: { predictionJob: {
        status: "pending", requestId: previous?.imageUrl === imageUrl ? previous.requestId : randomUUID(),
        imageUrl, attempts: previous?.attempts ?? 0, queuedAt: new Date(), requestedBy: session.user.id,
      } } }, { session: dbSession });
      if (!update.matchedCount) return false;
      await audit({ actorId: session.user.id, action: "inspection.prediction.queued", resource: "inspection",
        resourceId: id, regionId: inspection.regionId }, dbSession);
      return true;
    }));
    if (!accepted) {
      const current = await inspectionsCollection.findOne(filter, { projection: { predictionJob: 1 } });
      if (current?.predictionJob && ["pending", "processing"].includes(current.predictionJob.status)) {
        return Response.json({ status: current.predictionJob.status }, { status: 202 });
      }
      return Response.json({ message: "Inspection changed. Refresh and try again." }, { status: 409 });
    }
    return Response.json({ status: "pending" }, { status: 202 });
  } catch {
    return Response.json({ message: "Could not queue prediction" }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await authorizeAPI("ai:review", request);
    if (error) return error;
    const scope = getInspectionFilter(session.user);
    const { id } = await context.params;
    if (!scope || !ObjectId.isValid(id)) return new Response(null, { status: 404 });
    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const cancelled = await inspectionsCollection.findOneAndUpdate({
        ...scope, _id: new ObjectId(id), prediction: { $exists: false },
        $or: [{ "predictionJob.status": "pending" },
          { "predictionJob.status": "processing", "predictionJob.leaseUntil": { $lte: new Date() } }],
      }, {
        $set: { "predictionJob.status": "failed", "predictionJob.failure": "cancelled", "predictionJob.finishedAt": new Date() },
        $unset: { "predictionJob.leaseId": "", "predictionJob.leaseUntil": "" },
      }, { session: dbSession, projection: { regionId: 1 } });
      if (!cancelled) return Response.json({ message: "No queued or expired prediction to cancel" }, { status: 409 });
      await audit({ actorId: session.user.id, action: "inspection.prediction.cancelled", resource: "inspection",
        resourceId: id, regionId: cancelled.regionId }, dbSession);
      return new Response(null, { status: 204 });
    }));
  } catch {
    return Response.json({ message: "Could not cancel the prediction" }, { status: 503 });
  }
}
