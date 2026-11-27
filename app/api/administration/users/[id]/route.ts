import { lockRegion } from "@/lib/region-security";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { ObjectId } from "mongodb";
import client, { db } from "@/lib/db";
import { authorizeAdmin } from "@/lib/admin-access";

import {
  usersCollection,
  fieldTasksCollection,
} from "@/lib/collections";

import {
  updateUserSchema,
} from "@/lib/validations/administration";

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
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }

    const userId = new ObjectId(id).toHexString();

    if (userId === session.user.id) {
      return Response.json(
        { message: "You cannot modify your own account here" },
        { status: 403 }
      );
    }

    const target = await usersCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!target) {
      return Response.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (target.role?.split(",").includes("admin")) {
      return Response.json(
        { message: "Administrator accounts are protected" },
        { status: 403 }
      );
    }

    const body = await readJSON(request);

    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.role === "admin") {
      await audit({ actorId: session.user.id, action: "authorization.denied", resource: "user", resourceId: userId, outcome: "denied" });
      return Response.json(
        { message: "Administrator promotion is restricted" },
        { status: 403 }
      );
    }

    if (!data.regionId) {
      return Response.json({ message: "Region is required" }, { status: 400 });
    }

    const actions = [
      ...(data.role !== target.role ? ["user.role.change"] : []),
      ...(data.regionId !== target.regionId ? ["user.region.change"] : []),
      ...(data.banned !== Boolean(target.banned) ? [data.banned ? "user.deactivate" : "user.activate"] : []),
      ...(data.name !== target.name ? ["user.name.change"] : []),
    ];
    const destination = data.regionId;
    const now = new Date();

    const updated = await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      for (const regionId of [...new Set([target.regionId, destination])].filter((value): value is string => Boolean(value && ObjectId.isValid(value))).sort()) {
        if (!(await lockRegion(dbSession, regionId, regionId === destination)) && regionId === destination) return "inactive";
      }
      if (target.role === "field_worker" && (target.role !== data.role || target.regionId !== destination)) {
        const activeTask = await fieldTasksCollection.findOne({
          assignedTo: userId, status: { $in: ["assigned", "in_progress"] },
        }, { session: dbSession, projection: { _id: 1 } });
        if (activeTask) return "active-tasks";
      }
      const changed = await usersCollection.updateOne(
        {
          _id: target._id, role: target.role, updatedAt: target.updatedAt,
          regionId: target.regionId ?? null,
          banned: target.banned ? true : { $ne: true },
        },
        { $set: {
          name: data.name,
          regionId: data.regionId,
          role: data.role,
          banned: data.banned,
          banReason: data.banned ? "Account deactivated by administrator" : null,
          banExpires: null,
          updatedAt: now,
        } },
        { session: dbSession },
      );
      if (!changed.matchedCount) return false;

      if (data.role !== target.role || data.regionId !== target.regionId || data.banned !== Boolean(target.banned)) {
        await db.collection("session").deleteMany({ userId: { $in: [target._id, userId] } }, { session: dbSession });
        await audit({ actorId: session.user.id, action: "session.revoke", resource: "user", resourceId: userId }, dbSession);
      }
      for (const action of actions) {
        await audit({ actorId: session.user.id, action, resource: "user", resourceId: userId, regionId: destination }, dbSession);
      }
      return true;
    }));
    if (updated === "inactive") return Response.json({ message: "Select a valid active region" }, { status: 409 });
    if (updated === "active-tasks") return Response.json({ message: "Finish or cancel active tasks before moving this worker" }, { status: 409 });
    if (!updated) return Response.json({ message: "Account changed. Reload and try again." }, { status: 409 });

    return Response.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    console.error("api/administration/users/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}