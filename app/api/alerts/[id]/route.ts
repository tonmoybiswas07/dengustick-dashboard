import { ObjectId } from "mongodb";
import { z } from "zod";

import { authorizeAPI } from "@/lib/api-auth";
import { alertsCollection } from "@/lib/collections";
import { getAlertFilter } from "@/lib/alert-access";
import { hasPermission } from "@/lib/permissions";

const updateAlertSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("read"),
    }),

    z.object({
      action: z.literal("resolve"),
      resolutionNotes: z.string().trim().min(5).max(2000),
    }),
  ]
);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "alerts:view", request
    );

    if (error) return error;

    const user = session.user;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid alert ID" },
        { status: 400 }
      );
    }

    const filter = getAlertFilter(user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    const validation = updateAlertSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { message: "Invalid alert update" },
        { status: 400 }
      );
    }

    const data = validation.data;

    const query = {
      ...filter,
      _id: new ObjectId(id),
    };

    if (data.action === "read") {
      const result = await alertsCollection.updateOne(
        query,
        {
          $addToSet: {
            readBy: user.id,
          },
        }
      );

      if (!result.matchedCount) {
        return Response.json(
          { message: "Alert not found" },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Alert marked as read",
      });
    }

    if (!hasPermission(user.role, "alerts:manage")) {
      return Response.json(
        { message: "Permission denied" },
        { status: 403 }
      );
    }

    const result = await alertsCollection.updateOne(
      {
        ...query,
        status: "active",
      },
      {
        $set: {
          status: "resolved",
          resolvedBy: user.id,
          resolvedByName: user.name,
          resolutionNotes: data.resolutionNotes,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },

        $addToSet: {
          readBy: user.id,
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json(
        { message: "Alert unavailable or already resolved" },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      message: "Alert resolved successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to update alert" },
      { status: 500 }
    );
  }
}