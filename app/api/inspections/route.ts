import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection, regionsCollection } from "@/lib/collections";
import { inspectionSchema } from "@/lib/validations/inspection";
import type { Inspection } from "@/app/types/inspection";
import type { Filter } from "mongodb";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("inspections:view");

    if (error) return error;

    const user = session.user;
    const { searchParams } = new URL(request.url);

    const rawPage = Number(searchParams.get("page") ?? 1);
    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

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
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      inspectionsCollection.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      data: inspections.map((inspection) => ({
        ...inspection,
        _id: inspection._id.toHexString(),
      })),
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
    const { session, error } = await authorizeAPI("inspections:create", request);

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
    if (!ObjectId.isValid(data.regionId)) {
      return Response.json({ message: "Invalid region ID" }, { status: 400 });
    }

    const regionId = new ObjectId(data.regionId).toHexString();

    if (
      user.role !== "admin" &&
      (!user.regionId || user.regionId !== regionId)
    ) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const region = await regionsCollection.findOne(
      { _id: new ObjectId(regionId), isActive: true },
      { projection: { _id: 1 } }
    );

    if (!region) {
      return Response.json(
        { message: "Select a valid active region" },
        { status: 400 }
      );
    }

    const now = new Date();

    const inspection: Omit<Inspection, "_id"> = {
      inspectionId: `DV-${randomUUID()}`,
      inspectorId: user.id,
      inspectorName: user.name,
      regionId,
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