import { connection } from "next/server";
import { randomUUID } from "crypto";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { hasPermission } from "@/lib/permissions";

import {
  reportsCollection,
  inspectionsCollection,
  fieldTasksCollection,
} from "@/lib/collections";

import { generateReportSchema } from "@/lib/validations/report";
import { generateReportSnapshot } from "@/lib/report-service";

import type { Report } from "@/app/types/report";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "reports:view"
    );

    if (error) return error;

    const user = session.user;

    const filter: Filter<Omit<Report, "_id">> = {};
    let regionFilter: { regionId?: string } = {};

    if (user.role !== "admin") {
      if (!user.regionId) {
        return Response.json(
          { message: "Region access denied" },
          { status: 403 }
        );
      }

      regionFilter = { regionId: user.regionId };
      filter.regionId = user.regionId;
    }

    const canManageOperations = hasPermission(
      user.role,
      "operations:manage"
    );

    if (!canManageOperations) {
      filter.type = { $ne: "field_operations" };
    }

    const { searchParams } = new URL(request.url);

    const rawPage = Number(
      searchParams.get("page") ?? 1
    );

    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

    const limit = 10;

    const now = new Date();

    const dhakaDate = new Date(
      now.getTime() + 6 * 3600000
    );

    const monthStart = new Date(
      Date.UTC(
        dhakaDate.getUTCFullYear(),
        dhakaDate.getUTCMonth(),
        1
      ) - 6 * 3600000
    );

    const [
      reports,
      total,
      generatedByMe,
      thisMonth,
      inspectionDistricts,
      taskDistricts,
    ] = await Promise.all([
      reportsCollection
        .find(filter)
        .project({ snapshot: 0 })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      reportsCollection.countDocuments(filter),

      reportsCollection.countDocuments({
        ...filter,
        generatedBy: user.id,
      }),

      reportsCollection.countDocuments({
        ...filter,
        createdAt: { $gte: monthStart },
      }),

      inspectionsCollection.distinct(
        "location.district",
        regionFilter
      ),

      canManageOperations
        ? fieldTasksCollection.distinct(
            "location.district",
            regionFilter
          )
        : Promise.resolve([]),
    ]);

    const districts = [
      ...new Set([
        ...inspectionDistricts,
        ...taskDistricts,
      ]),
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0
      )
      .sort();

    return Response.json({
      success: true,

      data: reports,

      districts,

      stats: {
        total,
        generatedByMe,
        thisMonth,
      },

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
      { message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI(
      "reports:create", request
    );

    if (error) return error;

    const user = session.user;

    const regionId = user.role === "admin" ? null : user.regionId ?? null;

    if (user.role !== "admin" && !regionId) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    const validation =
      generateReportSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message:
            validation.error.issues[0]?.message ??
            "Invalid report data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (
      data.type === "field_operations" &&
      !hasPermission(
        user.role,
        "operations:manage"
      )
    ) {
      return Response.json(
        { message: "Permission denied" },
        { status: 403 }
      );
    }

    const snapshot = await generateReportSnapshot(
      data,
      regionId
    );

    const report: Omit<Report, "_id"> = {
      reportId: `RPT-${randomUUID()}`,

      title: data.title,
      type: data.type,

      filters: {
        startDate: data.startDate,
        endDate: data.endDate,
        district: data.district,
      },

      regionId,

      generatedBy: user.id,
      generatedByName: user.name,

      snapshot,

      createdAt: new Date(),
    };

    const result =
      await reportsCollection.insertOne(report);

    return Response.json(
      {
        success: true,
        message: "Report generated successfully",

        data: {
          ...report,
          _id: result.insertedId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to generate report" },
      { status: 500 }
    );
  }
}