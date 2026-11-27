import { directoryPageSize } from "@/lib/directory";
import { paginationQuery } from "@/lib/validations/query";
import { connection } from "next/server";

import { authorizeAPI } from "@/lib/api-auth";

import {
  usersCollection,
  fieldTasksCollection,
} from "@/lib/collections";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "operations:manage", request
    );

    if (error) return error;

    const user = session.user;

    if (user.role !== "admin" && !user.regionId) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const parsed = paginationQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ message: "Invalid directory page" }, { status: 400 });
    const { page } = parsed.data;

    const workers = await usersCollection
      .find({
        role: "field_worker",
        banned: { $ne: true },
        ...(user.role !== "admin" ? { regionId: user.regionId } : {}),
      })
      .project({
        name: 1,
        email: 1,
        regionId: 1,
      })
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * directoryPageSize)
      .limit(directoryPageSize + 1)
      .toArray();

    const visibleWorkers = workers.slice(0, directoryPageSize);
    const workerIds = visibleWorkers.map(
      (worker) => worker._id.toString()
    );

    const taskStats = await fieldTasksCollection
      .aggregate([
        {
          $match: {
            assignedTo: { $in: workerIds },
            ...(user.role !== "admin"
              ? { regionId: user.regionId }
              : {}),
          },
        },
        {
          $group: {
            _id: "$assignedTo",

            totalTasks: { $sum: 1 },

            completedTasks: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "completed"] },
                  1,
                  0,
                ],
              },
            },

            activeTasks: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["assigned", "in_progress"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const statsMap = new Map(
      taskStats.map((item) => [item._id, item])
    );

    const data = visibleWorkers.map((worker) => {
      const id = worker._id.toString();
      const stats = statsMap.get(id);

      return {
        id,
        name: worker.name,
        email: worker.email,
        regionId: worker.regionId ?? "",
        totalTasks: stats?.totalTasks ?? 0,
        completedTasks: stats?.completedTasks ?? 0,
        activeTasks: stats?.activeTasks ?? 0,
      };
    });

    return Response.json({
      success: true,
      pagination: { page, hasNext: workers.length > directoryPageSize },
      data,
    });
  } catch (error) {
    console.error("api/field-operations/workers request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch field workers" },
      { status: 500 }
    );
  }
}