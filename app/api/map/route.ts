import { mapQuery } from "@/lib/validations/map";
import { connection } from "next/server";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("map:view", request);

    if (error) return error;

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const parsed = mapQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ message: "Invalid map filters" }, { status: 400 });
    const { search, district, region, start, end, detection, status } = parsed.data;
    if (region && session.user.role !== "admin" && session.user.regionId !== region) {
      return Response.json({ message: "Region access denied" }, { status: 403 });
    }
    const escaped = search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const query = {
      ...filter,
      ...(region && { regionId: region }),
      ...(district && { "location.district": district }),
      ...(detection && { detectionResult: detection, confidenceScore: { $gte: 0, $lte: 1 } }),
      ...(status && { status }),
      ...((start || end) && { inspectedAt: {
        ...(start && { $gte: new Date(`${start}T00:00:00.000+06:00`) }),
        ...(end && { $lt: new Date(new Date(`${end}T00:00:00.000+06:00`).getTime() + 86_400_000) }),
      } }),
      ...(escaped && { $or: ["inspectionId", "location.area", "location.address", "location.district"].map(
        (field) => ({ [field]: { $regex: escaped, $options: "i" } }),
      ) }),
      "location.latitude": { $gte: -90, $lte: 90 },
      "location.longitude": { $gte: -180, $lte: 180 },
    };

    const [inspections, total, districtNames] = await Promise.all([
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
        .maxTimeMS(2500)
        .limit(1500)
        .toArray(),
      inspectionsCollection.countDocuments(query, { maxTimeMS: 2500 }),
      inspectionsCollection.distinct("location.district", filter, { maxTimeMS: 2500 }),
    ]);

    return Response.json({
      success: true,
      data: inspections.map((inspection) => ({
        ...inspection,
        _id: inspection._id.toString(),
      })),
      total,
      districts: districtNames.filter((name): name is string => typeof name === "string").sort(),
      truncated: total > inspections.length,
    });
  } catch (error) {
    console.error("api/map request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch map inspections" },
      { status: 500 }
    );
  }
}