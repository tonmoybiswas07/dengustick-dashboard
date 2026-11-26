import { randomUUID } from "node:crypto";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { inspectionSchema } from "@/lib/validations/inspection";
import type { Inspection } from "@/app/types/inspection";
import type { Filter } from "mongodb";

export async function GET(request: Request) {
  try {
    const { session, error } = await authorizeAPI("inspections:view");

    if (error) return error;

    const user = session.user;
    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    );

    const search = searchParams.get("search")?.trim().slice(0, 100);
    const status = searchParams.get("status");

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

    if (
      status === "pending" ||
      status === "under_review" ||
      status === "verified" ||
      status === "rejected"
    ) {
      filter.status = status;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        {
          inspectionId: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          inspectorName: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          "location.district": {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          "location.area": {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    const [inspections, total] = await Promise.all([
      inspectionsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      inspectionsCollection.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      data: inspections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI("inspections:create");

    if (error) return error;

    const body = await request.json().catch(() => null);
    const validation = inspectionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: "Invalid inspection data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const user = session.user;
    const data = validation.data;

    if (
      user.role !== "admin" &&
      (!user.regionId || user.regionId !== data.regionId)
    ) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const now = new Date();

    const inspection: Omit<Inspection, "_id"> = {
      inspectionId: `DV-${randomUUID()}`,
      inspectorId: user.id,
      inspectorName: user.name,
      regionId: data.regionId,
      location: data.location,
      breedingSiteType: data.breedingSiteType,
      images: data.images,
      detectionResult: "inconclusive",
      larvaeCount: null,
      confidenceScore: null,
      status: "pending",
      notes: data.notes,
      inspectedAt: new Date(data.inspectedAt),
      createdAt: now,
      updatedAt: now,
    };

    const result = await inspectionsCollection.insertOne(inspection);

    return Response.json(
      {
        success: true,
        message: "Inspection created successfully",
        data: {
          ...inspection,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to create inspection" },
      { status: 500 }
    );
  }
}