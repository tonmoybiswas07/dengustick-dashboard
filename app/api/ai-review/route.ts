import { connection } from "next/server";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";

import type { Inspection } from "@/app/types/inspection";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("ai:review");

    if (error) return error;

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") ?? "pending";

    const rawPage = Number(searchParams.get("page") ?? 1);
    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

    const limit = 12;

    const query: Filter<Omit<Inspection, "_id">> = {
      ...filter,
    };

    if (status === "pending") {
      query.status = {
        $in: ["pending", "under_review"],
      };
    } else if (
      status === "verified" ||
      status === "rejected"
    ) {
      query.status = status;
    }

    const [
      inspections,
      filteredTotal,
      total,
      pending,
      verified,
      rejected,
    ] = await Promise.all([
      inspectionsCollection
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      inspectionsCollection.countDocuments(query),

      inspectionsCollection.countDocuments(filter),

      inspectionsCollection.countDocuments({
        ...filter,
        status: {
          $in: ["pending", "under_review"],
        },
      }),

      inspectionsCollection.countDocuments({
        ...filter,
        status: "verified",
      }),

      inspectionsCollection.countDocuments({
        ...filter,
        status: "rejected",
      }),
    ]);

    return Response.json({
      success: true,
      data: inspections.map((inspection) => ({
        ...inspection,
        _id: inspection._id.toHexString(),
      })),
      stats: {
        total,
        pending,
        verified,
        rejected,
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
      { message: "Failed to fetch review queue" },
      { status: 500 }
    );
  }
}