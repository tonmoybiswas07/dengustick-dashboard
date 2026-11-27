import client from "@/lib/db";
import { lockRegion } from "@/lib/region-security";
import { taskQuery } from "@/lib/validations/query";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { connection } from "next/server";
import { randomUUID } from "crypto";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";

import {
  fieldTasksCollection,
  usersCollection,
} from "@/lib/collections";

import { createTaskSchema } from "@/lib/validations/field-operation";

import type { FieldTask } from "@/app/types/field-operation";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "operations:view"
    );

    if (error) return error;

    const user = session.user;

    const filter: Filter<Omit<FieldTask, "_id">> = {};

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

    const { searchParams } = new URL(request.url);

    const parsed = taskQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return Response.json({ message: "Invalid query parameters" }, { status: 400 });
    }
    const { page, status } = parsed.data;

    const limit = 10;

    const query: Filter<Omit<FieldTask, "_id">> = {
      ...filter,
    };

    if (
      status === "assigned" ||
      status === "in_progress" ||
      status === "completed" ||
      status === "cancelled"
    ) {
      query.status = status;
    }

    const now = new Date();

    const [
      tasks,
      filteredTotal,
      total,
      assigned,
      inProgress,
      completed,
      overdue,
    ] = await Promise.all([
      fieldTasksCollection
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      fieldTasksCollection.countDocuments(query),

      fieldTasksCollection.countDocuments(filter),

      fieldTasksCollection.countDocuments({
        ...filter,
        status: "assigned",
      }),

      fieldTasksCollection.countDocuments({
        ...filter,
        status: "in_progress",
      }),

      fieldTasksCollection.countDocuments({
        ...filter,
        status: "completed",
      }),

      fieldTasksCollection.countDocuments({
        ...filter,
        status: {
          $in: ["assigned", "in_progress"],
        },
        deadline: { $lt: now },
      }),
    ]);

    return Response.json({
      success: true,
      data: tasks.map((task) => ({
        ...task,
        _id: task._id.toHexString(),
        isOverdue:
          task.deadline < now &&
          (task.status === "assigned" || task.status === "in_progress"),
      })),
      stats: {
        total,
        assigned,
        inProgress,
        completed,
        overdue,
      },
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.min(1000, Math.ceil(filteredTotal / limit)),
      },
    });
  } catch (error) {
    console.error("api/field-operations/tasks request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI(
      "operations:manage", request
    );

    if (error) return error;

    const body = await readJSON(request);

    const validation = createTaskSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message:
            validation.error.issues[0]?.message ||
            "Invalid task data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (!ObjectId.isValid(data.assignedTo)) {
      return Response.json(
        { message: "Invalid worker ID" },
        { status: 400 }
      );
    }

    const user = session.user;
    const isAdmin = user.role === "admin";

    if (!isAdmin && !user.regionId) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const worker = await usersCollection.findOne({
        _id: new ObjectId(data.assignedTo),
        role: "field_worker",
        banned: { $ne: true },
        ...(isAdmin ? {} : { regionId: user.regionId }),
      }, { session: dbSession });

      if (!worker?.regionId || !ObjectId.isValid(worker.regionId)) {
        return Response.json(
          { message: "Field worker or assigned region not found" },
          { status: 404 }
        );
      }

      if (!(await lockRegion(dbSession, worker.regionId))) {
        return Response.json(
          { message: "The worker must belong to an active region" },
          { status: 409 }
        );
      }

      const task: Omit<FieldTask, "_id"> = {
        taskId: `TASK-${randomUUID()}`,
        title: data.title,
        description: data.description,
        regionId: worker.regionId,
        location: data.location,

        assignedTo: worker._id.toString(),
        assignedToName: worker.name,

        assignedBy: session.user.id,
        assignedByName: session.user.name,

        priority: data.priority,
        status: "assigned",
        inspectionId: null,

        deadline: new Date(data.deadline),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result =
        await fieldTasksCollection.insertOne(task, { session: dbSession });

      await audit({ actorId: user.id, action: "task.assign", resource: "task", resourceId: result.insertedId.toHexString(), regionId: task.regionId }, dbSession);

      return Response.json(
        {
          success: true,
          message: "Task assigned successfully",
          data: {
            ...task,
            isOverdue: false,
            _id: result.insertedId.toString(),
          },
        },
        { status: 201 }
      );
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    console.error("api/field-operations/tasks request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to assign task" },
      { status: 500 }
    );
  }
}