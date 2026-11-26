
import { authorizeAPI } from "@/lib/api-auth";

import {
  usersCollection,
  fieldTasksCollection,
} from "@/lib/collections";

export async function GET() {
  try {
    const { session, error } = await authorizeAPI(
      "operations:manage"
    );

    if (error) return error;

    const user = session.user;

    if (user.role !== "admin" && !user.regionId) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const filter = {
      role: "field_worker",
      ...(user.role !== "admin"
        ? { regionId: user.regionId }
        : {}),
    };

    const workers = await usersCollection
      .find(filter)
      .project({
        name: 1,
        email: 1,
        regionId: 1,
      })
      .sort({ name: 1 })
      .toArray();

    const workerIds = workers.map(
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

    const data = workers.map((worker) => {
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
      data,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch field workers" },
      { status: 500 }
    );
  }
}