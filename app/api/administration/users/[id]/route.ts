import { ObjectId } from "mongodb";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { authorizeAdmin } from "@/lib/admin-access";

import {
  usersCollection,
  regionsCollection,
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
    const { session, error } = await authorizeAdmin();

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }

    if (id === session.user.id) {
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

    if (target.role === "admin") {
      return Response.json(
        { message: "Administrator accounts are protected" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

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
      return Response.json(
        { message: "Administrator promotion is restricted" },
        { status: 403 }
      );
    }

    const region = await regionsCollection.findOne({
      _id: new ObjectId(data.regionId!),
      isActive: true,
    });

    if (!region) {
      return Response.json(
        { message: "Select a valid active region" },
        { status: 400 }
      );
    }

    const requestHeaders = await headers();

    if (data.banned && !target.banned) {
      await auth.api.banUser({
        headers: requestHeaders,

        body: {
          userId: id,
          banReason: "Account deactivated by administrator",
        },
      });
    }

    await auth.api.adminUpdateUser({
      headers: requestHeaders,

      body: {
        userId: id,

        data: {
          name: data.name,
          regionId: data.regionId,
        },
      },
    });

    await auth.api.setRole({
      headers: requestHeaders,

      body: {
        userId: id,
        role: data.role,
      },
    });

    await auth.api.revokeUserSessions({
      headers: requestHeaders,

      body: {
        userId: id,
      },
    });

    if (!data.banned && target.banned) {
      await auth.api.unbanUser({
        headers: requestHeaders,

        body: {
          userId: id,
        },
      });
    }

    return Response.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}