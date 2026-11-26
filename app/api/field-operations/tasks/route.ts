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

    const status = searchParams.get("status") ?? "all";

    const rawPage = Number(searchParams.get("page") ?? 1);

    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

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
        deadline: { $lt: new Date() },
      }),
    ]);

    return Response.json({
      success: true,
      data: tasks,
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
        totalPages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI(
      "operations:manage"
    );

    if (error) return error;

    const body = await request.json().catch(() => null);

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

    const worker = await usersCollection.findOne({
      _id: new ObjectId(data.assignedTo),
      role: "field_worker",
    });

    if (!worker || !worker.regionId) {
      return Response.json(
        { message: "Field worker or assigned region not found" },
        { status: 404 }
      );
    }

    if (
      session.user.role !== "admin" &&
      (
        !session.user.regionId ||
        worker.regionId !== session.user.regionId
      )
    ) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
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
      await fieldTasksCollection.insertOne(task);

    return Response.json(
      {
        success: true,
        message: "Task assigned successfully",
        data: {
          ...task,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to assign task" },
      { status: 500 }
    );
  }
}