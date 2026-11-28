import { mapQuery } from "@/lib/validations/map";
import { connection } from "next/server";
import { MongoServerError } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";

const rowLimit = 1500;
const queryTimeout = { maxTimeMS: 2500 };

function logQueryFailure(operation: string, error: unknown) {
  console.error("api/map query failed", {
    operation,
    type: error instanceof Error ? error.name : "UnknownError",
    code: error instanceof MongoServerError && typeof error.code === "number" ? error.code : undefined,
  });
}

export async function GET(request: Request) {
  await connection();

  let operation = "authorization";
  try {
    if (request.signal.aborted) return new Response(null, { status: 499 });
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
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const message = field === "viewport" ? "Invalid map area. Clear the map area and try again."
        : field === "start" || field === "end" ? "Check the inspection date range."
        : field === "district" ? "Enter a valid district."
        : "Check your map filters and try again.";
      return Response.json({ message }, { status: 400 });
    }
    const { search, district, region, start, end, detection, status, viewport } = parsed.data;
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
      "location.latitude": { $gte: viewport?.south ?? -90, $lte: viewport?.north ?? 90 },
      "location.longitude": viewport && viewport.west < viewport.east
        ? { $gte: viewport.west, $lte: viewport.east } : { $gte: -180, $lte: 180 },
      ...(viewport && viewport.west > viewport.east && { $and: [{ $or: [
        { "location.longitude": { $gte: viewport.west } },
        { "location.longitude": { $lte: viewport.east } },
      ] }] }),
    };

    if (request.signal.aborted) return new Response(null, { status: 499 });
    operation = "inspection records";
    const [rows, districtNames] = await Promise.all([
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
        .maxTimeMS(queryTimeout.maxTimeMS)
        .limit(rowLimit + 1)
        .toArray(),
      inspectionsCollection.distinct("location.district", filter, queryTimeout).catch((error: unknown) => {
        if (!request.signal.aborted) logQueryFailure("district options", error);
        return null;
      }),
    ]);

    if (request.signal.aborted) return new Response(null, { status: 499 });
    const truncated = rows.length > rowLimit;
    const inspections = rows.slice(0, rowLimit);
    const total = truncated ? await inspectionsCollection.countDocuments(query, queryTimeout).catch((error: unknown) => {
      if (!request.signal.aborted) logQueryFailure("inspection count", error);
      return null;
    }) : inspections.length;
    if (request.signal.aborted) return new Response(null, { status: 499 });

    return Response.json({
      success: true,
      data: inspections.map((inspection) => ({
        ...inspection,
        _id: inspection._id.toString(),
      })),
      total,
      districts: districtNames?.filter((name): name is string => typeof name === "string").sort() ?? null,
      truncated,
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    logQueryFailure(operation, error);
    const timedOut = error instanceof MongoServerError && error.code === 50;
    return Response.json({
      message: timedOut
        ? "Loading inspection locations took too long. Narrow the map area or date range and try again."
        : "Inspection locations are temporarily unavailable. Try again.",
    }, { status: timedOut ? 503 : 500 });
  }
}
