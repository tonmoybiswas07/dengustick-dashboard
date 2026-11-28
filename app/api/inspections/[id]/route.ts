import { publicPredictionJob, predictionUnlocked } from "@/lib/inspection-prediction-state";
import { syncInspectionImages, UnavailableInspectionImage } from "@/lib/inspection-images";
import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection, regionsCollection, fieldTasksCollection, alertsCollection } from "@/lib/collections";
import { inspectionSchema } from "@/lib/validations/inspection";
import { getInspectionFilter } from "@/lib/inspection-access";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "inspections:view"
    );

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const inspection = await inspectionsCollection.findOne({
      ...filter,
      _id: new ObjectId(id),
    });

    if (!inspection) {
      return Response.json(
        { message: "Inspection not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: { ...inspection, predictionJob: publicPredictionJob(inspection.predictionJob), _id: inspection._id.toHexString() },
    });
  } catch (error) {
    console.error("api/inspections/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:update", request
    );

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const body = await readJSON(request);
    const validation = inspectionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: "Invalid inspection data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const regionId = ObjectId.isValid(data.regionId)
      ? new ObjectId(data.regionId).toHexString()
      : data.regionId;

    if (
      session.user.role !== "admin" &&
      regionId !== session.user.regionId
    ) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const existing = await inspectionsCollection.findOne(
      { ...filter, _id: new ObjectId(id), status: "pending" },
      { projection: { regionId: 1, prediction: 1, predictionJob: 1, updatedAt: 1 } }
    );

    if (existing?.prediction && existing.predictionJob?.imageUrl && !data.images.includes(existing.predictionJob.imageUrl)) {
      return Response.json({ message: "Evidence used by an original prediction must be retained" }, { status: 409 });
    }
    if (existing && existing.regionId !== regionId) {
      if (!ObjectId.isValid(regionId)) {
        return Response.json({ message: "Invalid region ID" }, { status: 400 });
      }

      const region = await regionsCollection.findOne(
        { _id: new ObjectId(regionId), isActive: true },
        { projection: { _id: 1 } }
      );

      if (!region) {
        return Response.json(
          { message: "Select a valid active region" },
          { status: 400 }
        );
      }
    }

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const result = await inspectionsCollection.updateOne(
        {
          ...filter,
          ...predictionUnlocked,
          _id: new ObjectId(id),
          status: "pending",
          ...(existing && { updatedAt: existing.updatedAt }),
          regionId: existing?.regionId ?? regionId,
        },
        {
          $set: {
            ...data,
            regionId,
            inspectedAt: new Date(data.inspectedAt),
            updatedAt: new Date(),
          },
        }, { session: dbSession },
      );

      if (!result.matchedCount) {
        return Response.json(
          {
            message:
              "Inspection not found or no longer editable",
          },
          { status: 404 }
        );
      }

      await syncInspectionImages(new ObjectId(id), data.images, session.user.id, regionId, dbSession);
      await audit({ actorId: session.user.id, action: "inspection.update", resource: "inspection", resourceId: id, regionId: regionId }, dbSession);

      return Response.json({
        success: true,
        message: "Inspection updated successfully",
      });
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    if (error instanceof UnavailableInspectionImage) {
      return Response.json({ message: "One or more inspection images are unavailable" }, { status: 409 });
    }
    console.error("api/inspections/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to update inspection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:delete", request
    );

    if (error) return error;
    await readJSON(request);

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const inspectionId = new ObjectId(id).toHexString();
    const [task, alert] = await Promise.all([
      fieldTasksCollection.findOne({ inspectionId }, { projection: { _id: 1 } }),
      alertsCollection.findOne({ sourceType: "inspection", sourceId: inspectionId }, { projection: { _id: 1 } }),
    ]);
    if (task || alert) {
      return Response.json({ message: "Linked records require this inspection" }, { status: 409 });
    }

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const deleted = await inspectionsCollection.findOneAndDelete({
        ...filter,
        ...predictionUnlocked,
        prediction: { $exists: false },
        _id: new ObjectId(id),
        status: "pending",
        linkedTaskId: { $exists: false },
      }, { projection: { regionId: 1 }, session: dbSession });

      if (!deleted) {
        return Response.json(
          {
            message:
              "Inspection not found or cannot be deleted",
          },
          { status: 404 }
        );
      }

      await syncInspectionImages(deleted._id, [], session.user.id, deleted.regionId, dbSession);
      await audit({ actorId: session.user.id, action: "inspection.delete", resource: "inspection", resourceId: id, regionId: deleted.regionId }, dbSession);

      return Response.json({
        success: true,
        message: "Inspection deleted successfully",
      });
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    console.error("api/inspections/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to delete inspection" },
      { status: 500 }
    );
  }
}