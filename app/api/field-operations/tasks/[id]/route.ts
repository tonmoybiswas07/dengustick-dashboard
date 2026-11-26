import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { hasPermission } from "@/lib/permissions";

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
      "operations:update"
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

    const body = await request.json().catch(() => null);

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

    const canManage = hasPermission(
      user.role,
      "operations:manage"
    );

    if (data.status === "cancelled" && !canManage) {
      return Response.json(
        { message: "Permission denied" },
        { status: 403 }
      );
    }

    const allowedTransitions: Record<string, string[]> = {
      assigned: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (
      !allowedTransitions[task.status].includes(data.status)
    ) {
      return Response.json(
        { message: "Invalid task status transition" },
        { status: 409 }
      );
    }

    let inspectionId = task.inspectionId;

    if (data.status === "completed") {
      if (!data.inspectionId) {
        return Response.json(
          { message: "Inspection ID is required" },
          { status: 400 }
        );
      }

      const inspection = await inspectionsCollection.findOne({
        _id: new ObjectId(data.inspectionId),
        inspectorId: task.assignedTo,
        regionId: task.regionId,
        status: { $ne: "rejected" },
        inspectedAt: { $gte: task.createdAt },
      });

      if (!inspection) {
        return Response.json(
          { message: "Valid inspection record not found" },
          { status: 400 }
        );
      }

      inspectionId = inspection._id.toString();
    }

    const result = await fieldTasksCollection.updateOne(
      {
        ...filter,
        status: task.status,
      },
      {
        $set: {
          status: data.status,
          inspectionId,
          completedAt:
            data.status === "completed"
              ? new Date()
              : null,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json(
        { message: "Task was already updated" },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      message: "Task status updated successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to update task" },
      { status: 500 }
    );
  }
}