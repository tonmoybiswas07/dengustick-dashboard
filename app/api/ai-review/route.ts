import { reviewQuery } from "@/lib/validations/query";
import { connection } from "next/server";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";

import type { Inspection } from "@/app/types/inspection";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("ai:review", request);

    if (error) return error;

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const parsed = reviewQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return Response.json({ message: "Invalid query parameters" }, { status: 400 });
    }
    const { page, status } = parsed.data;

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
        totalPages: Math.min(1000, Math.ceil(filteredTotal / limit)),
      },
    });
  } catch (error) {
    console.error("api/ai-review request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch review queue" },
      { status: 500 }
    );
  }
}