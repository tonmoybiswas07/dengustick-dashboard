import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { connection } from "next/server";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { hasPermission } from "@/lib/permissions";
import { reportsCollection } from "@/lib/collections";

import {
  generateCSV,
  generatePDF,
} from "@/lib/report-export";

import type { Report } from "@/app/types/report";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "reports:view", request
    );

    if (error) return error;

    const user = session.user;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid report ID" },
        { status: 400 }
      );
    }

    const filter: Filter<Omit<Report, "_id">> = {
      _id: new ObjectId(id),
    };

    if (user.role !== "admin") {
      if (!user.regionId) {
        return Response.json(
          { message: "Region access denied" },
          { status: 403 }
        );
      }

      filter.regionId = user.regionId;
      if (user.role === "researcher") filter.generatedBy = user.id;
    }

    if (
      !hasPermission(
        user.role,
        "operations:manage"
      )
    ) {
      filter.type = {
        $ne: "field_operations",
      };
    }

    const { searchParams } = new URL(request.url);

    const format = searchParams.get("format");

    if (
      format &&
      format !== "pdf" &&
      format !== "csv"
    ) {
      return Response.json(
        { message: "Invalid export format" },
        { status: 400 }
      );
    }

    if (
      format &&
      !hasPermission(user.role, "reports:export")
    ) {
      return Response.json(
        { message: "Export permission denied" },
        { status: 403 }
      );
    }

    if (format) {
      const limited = await rateLimit("report-export", user.id, 10);
      if (limited) return limited;
    }

    const report =
      await reportsCollection.findOne(filter);

    if (!report) {
      return Response.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    const filename = `denguevision-${id}`;

    if (format === "csv") {
      const file = generateCSV(report);
      await audit({ actorId: user.id, action: "report.export", resource: "report", resourceId: id, regionId: report.regionId, metadata: { format } });
      return new Response(file, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="${filename}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (format === "pdf") {
      const file = generatePDF(report);
      await audit({ actorId: user.id, action: "report.export", resource: "report", resourceId: id, regionId: report.regionId, metadata: { format } });
      return new Response(file, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            `attachment; filename="${filename}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    return Response.json(
      {
        success: true,
        data: {
          ...report,
          _id: report._id.toString(),
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("api/reports/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to retrieve report" },
      { status: 500 }
    );
  }
}