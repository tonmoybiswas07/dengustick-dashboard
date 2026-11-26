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
  try {
    const { session, error } = await authorizeAPI(
      "reports:view"
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
      return new Response(generateCSV(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="${filename}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (format === "pdf") {
      return new Response(generatePDF(report), {
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
    console.error(error);

    return Response.json(
      { message: "Failed to retrieve report" },
      { status: 500 }
    );
  }
}