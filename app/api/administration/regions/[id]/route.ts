import { ObjectId } from "mongodb";

import { authorizeAdmin } from "@/lib/admin-access";

import {
  regionsCollection,
  usersCollection,
  fieldTasksCollection,
} from "@/lib/collections";

import { regionSchema } from "@/lib/validations/administration";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { error } = await authorizeAdmin();

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid region ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    const validation = regionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existing = await regionsCollection.findOne({
      code: data.code,
      _id: { $ne: new ObjectId(id) },
    });

    if (existing) {
      return Response.json(
        { message: "Region code already exists" },
        { status: 409 }
      );
    }

    if (!data.isActive) {
      const [activeUsers, activeTasks] =
        await Promise.all([
          usersCollection.countDocuments({
            regionId: id,
            banned: { $ne: true },
          }),

          fieldTasksCollection.countDocuments({
            regionId: id,

            status: {
              $in: ["assigned", "in_progress"],
            },
          }),
        ]);

      if (activeUsers > 0 || activeTasks > 0) {
        return Response.json(
          {
            message:
              "Reassign active users and finish active tasks before deactivating this region",
          },
          { status: 409 }
        );
      }
    }

    const result = await regionsCollection.updateOne(
      { _id: new ObjectId(id) },

      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json(
        { message: "Region not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Region updated successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to update region" },
      { status: 500 }
    );
  }
}