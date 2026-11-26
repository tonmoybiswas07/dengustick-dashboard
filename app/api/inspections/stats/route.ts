import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import type { Filter } from "mongodb";
import type { Inspection } from "@/app/types/inspection";

export async function GET() {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:view"
    );

    if (error) return error;

    const user = session.user;

    const filter: Filter<Omit<Inspection, "_id">> = {};

    if (user.role !== "admin") {
      if (!user.regionId) {
        return Response.json(
          { message: "No region assigned" },
          { status: 403 }
        );
      }

      filter.regionId = user.regionId;
    }

    if (user.role === "field_worker") {
      filter.inspectorId = user.id;
    }

    const [total, pending, verified, rejected] =
      await Promise.all([
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
      data: {
        total,
        pending,
        verified,
        rejected,
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch inspection statistics" },
      { status: 500 }
    );
  }
}