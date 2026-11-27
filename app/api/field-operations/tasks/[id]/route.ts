import { canTransitionTask } from "@/lib/task-status";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import client from "@/lib/db";
import { MongoServerError, ObjectId } from "mongodb";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";

import {
  fieldTasksCollection,
  inspectionsCollection,
} from "@/lib/collections";

import { updateTaskSchema } from "@/lib/validations/field-operation";

import type { FieldTask } from "@/app/types/field-operation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "operations:update", request
    );

    if (error) return error;

    const user = session.user;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const body = await readJSON(request);

    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { message: "Invalid task update" },
        { status: 400 }
      );
    }

    const data = validation.data;

    const filter: Filter<Omit<FieldTask, "_id">> = {
      _id: new ObjectId(id),
    };

    if (user.role !== "admin") {
      if (!user.regionId) {
        return Response.json(
          { message: "Region access denied" },
          { status: 403 }
        );
      }

      filter.regionId = user.regionId;
    }

    if (user.role === "field_worker") {
      filter.assignedTo = user.id;
    }

    const task = await fieldTasksCollection.findOne(filter);

    if (!task) {
      return Response.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    if (user.role === "field_worker" && data.status === "cancelled") {
      return Response.json({ message: "Cancellation requires a supervisor" }, { status: 403 });
    }

    if (!canTransitionTask(task.status, data.status)) {
      return Response.json(
        { message: "Invalid task status transition" },
        { status: 409 }
      );
    }

    const updated = await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      let inspectionId = task.inspectionId;
      if (data.status === "completed") {
        if (!data.inspectionId) return "Inspection ID is required";
        inspectionId = new ObjectId(data.inspectionId).toHexString();
        const existing = await fieldTasksCollection.findOne({ inspectionId }, { session: dbSession });
        if (existing) return "Inspection is already linked to a task";
        const inspection = await inspectionsCollection.findOneAndUpdate({
          _id: new ObjectId(inspectionId),
          inspectorId: task.assignedTo,
          regionId: task.regionId,
          status: { $ne: "rejected" },
          inspectedAt: { $gte: task.createdAt },
          linkedTaskId: { $exists: false },
        }, { $set: { linkedTaskId: id } }, { session: dbSession, projection: { _id: 1 } });
        if (!inspection) return "A valid unlinked inspection is required";
      }

      const result = await fieldTasksCollection.updateOne(
        { ...filter, status: task.status },
        { $set: {
          status: data.status,
          inspectionId,
          completedAt: data.status === "completed" ? new Date() : null,
          updatedAt: new Date(),
        } },
        { session: dbSession },
      );

      if (!result.matchedCount) {
        await dbSession.abortTransaction();
        return "Task was already updated";
      }
      await audit({ actorId: user.id, action: "task.status", resource: "task", resourceId: id, regionId: task.regionId, metadata: { status: data.status } }, dbSession);
      return null;
    }));

    if (updated) {
      return Response.json(
        { message: updated },
        { status: 409 }
      );
    }


    return Response.json({
      success: true,
      message: "Task status updated successfully",
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ message: "Inspection is already linked to a task" }, { status: 409 });
    }
    console.error("api/field-operations/tasks/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to update task" },
      { status: 500 }
    );
  }
}