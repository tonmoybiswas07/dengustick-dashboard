import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { alertsCollection } from "@/lib/collections";
import { getAlertFilter } from "@/lib/alert-access";

import type { Alert } from "@/app/types/alert";

export async function GET(request: Request) {
  try {
    const { session, error } = await authorizeAPI(
      "alerts:view"
    );

    if (error) return error;

    const user = session.user;
    const filter = getAlertFilter(user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") ?? "all";
    const severity = searchParams.get("severity") ?? "all";

    const rawPage = Number(searchParams.get("page") ?? 1);

    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

    const limit = 10;

    const query: Filter<Omit<Alert, "_id">> = {
      ...filter,
    };

    if (status === "active" || status === "resolved") {
      query.status = status;
    }

    if (status === "unread") {
      query.readBy = { $ne: user.id };
    }

    if (
      severity === "low" ||
      severity === "medium" ||
      severity === "high" ||
      severity === "critical"
    ) {
      query.severity = severity;
    }

    const [
      alerts,
      filteredTotal,
      total,
      unread,
      active,
      highPriority,
      resolved,
    ] = await Promise.all([
      alertsCollection
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      alertsCollection.countDocuments(query),

      alertsCollection.countDocuments(filter),

      alertsCollection.countDocuments({
        ...filter,
        readBy: { $ne: user.id },
      }),

      alertsCollection.countDocuments({
        ...filter,
        status: "active",
      }),

      alertsCollection.countDocuments({
        ...filter,
        status: "active",
        severity: {
          $in: ["high", "critical"],
        },
      }),

      alertsCollection.countDocuments({
        ...filter,
        status: "resolved",
      }),
    ]);

    const data = alerts.map(({ readBy, ...alert }) => ({
      ...alert,
      _id: alert._id.toString(),
      isRead: readBy.includes(user.id),
    }));

    return Response.json({
      success: true,
      data,

      stats: {
        total,
        unread,
        active,
        highPriority,
        resolved,
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
      { message: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}