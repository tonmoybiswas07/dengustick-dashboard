import { connection } from "next/server";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";

export async function GET() {
  await connection();

  try {
    const { session, error } = await authorizeAPI("map:view");

    if (error) return error;

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const query = {
      ...filter,
      "location.latitude": {
        $gte: -90,
        $lte: 90,
      },
      "location.longitude": {
        $gte: -180,
        $lte: 180,
      },
    };

    const [inspections, total] = await Promise.all([
      inspectionsCollection
        .find(query)
        .project({
          inspectionId: 1,
          inspectorName: 1,
          regionId: 1,
          location: 1,
          breedingSiteType: 1,
          detectionResult: 1,
          status: 1,
          larvaeCount: 1,
          confidenceScore: 1,
          inspectedAt: 1,
        })
        .sort({ inspectedAt: -1, _id: -1 })
        .limit(5000)
        .toArray(),
      inspectionsCollection.countDocuments(query),
    ]);

    return Response.json({
      success: true,
      data: inspections.map((inspection) => ({
        ...inspection,
        _id: inspection._id.toString(),
      })),
      total,
      truncated: total > inspections.length,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch map inspections" },
      { status: 500 }
    );
  }
}