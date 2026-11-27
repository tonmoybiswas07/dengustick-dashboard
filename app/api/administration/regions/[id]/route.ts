import client from "@/lib/db";
import { lockRegion } from "@/lib/region-security";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { MongoServerError, ObjectId } from "mongodb";

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
    const { session, error } = await authorizeAdmin(request);

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid region ID" },
        { status: 400 }
      );
    }

    const body = await readJSON(request);

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
    const regionId = new ObjectId(id);

    const existing = await regionsCollection.findOne({
      code: data.code,
      _id: { $ne: regionId },
    });

    if (existing) {
      return Response.json(
        { message: "Region code already exists" },
        { status: 409 }
      );
    }

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      if (!(await lockRegion(dbSession, id, false))) {
        return Response.json({ message: "Region not found" }, { status: 404 });
      }
      if (!data.isActive) {
        const activeUsers = await usersCollection.countDocuments({
          regionId: regionId.toHexString(), banned: { $ne: true },
        }, { session: dbSession });
        const activeTasks = await fieldTasksCollection.countDocuments({
          regionId: regionId.toHexString(), status: { $in: ["assigned", "in_progress"] },
        }, { session: dbSession });
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
        { _id: regionId },

        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        }, { session: dbSession },
      );

      if (!result.matchedCount) {
        return Response.json(
          { message: "Region not found" },
          { status: 404 }
        );
      }

      await audit({ actorId: session.user.id, action: "region.update", resource: "region", resourceId: id, regionId: id }, dbSession);

      return Response.json({
        success: true,
        message: "Region updated successfully",
      });
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    if (
      error instanceof MongoServerError &&
      error.code === 11000 &&
      error.keyPattern?.code === 1
    ) {
      return Response.json(
        { message: "Region code already exists" },
        { status: 409 }
      );
    }

    console.error("api/administration/regions/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to update region" },
      { status: 500 }
    );
  }
}