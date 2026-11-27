import { connection } from "next/server";
import { getSystemSettings } from "@/lib/settings";
import { authorizeAPI } from "@/lib/api-auth";

import { getDashboardData } from "@/lib/dashboard-service";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "dashboard:view", request
    );

    if (error) return error;

    const { searchParams } = new URL(request.url);

    const range = searchParams.get("range") ?? (await getSystemSettings()).dashboardRange;

    if (!["7", "30", "90"].includes(range)) {
      return Response.json(
        {
          message: "Invalid date range",
        },
        {
          status: 400,
        }
      );
    }

    if (
      session.user.role !== "admin" &&
      !session.user.regionId
    ) {
      return Response.json(
        {
          message: "No region assigned",
        },
        {
          status: 403,
        }
      );
    }

    const data = await getDashboardData(
      session.user,
      Number(range)
    );

    return Response.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Dashboard request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      {
        message: "Failed to load dashboard data",
      },
      {
        status: 500,
      }
    );
  }
}