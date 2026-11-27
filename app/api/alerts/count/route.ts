import { connection } from "next/server";
import { authorizeAPI } from "@/lib/api-auth";
import { alertsCollection } from "@/lib/collections";
import { getAlertFilter } from "@/lib/alert-access";

export async function GET() {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "alerts:view"
    );

    if (error) return error;

    const filter = getAlertFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const count = await alertsCollection.countDocuments({
      ...filter,
      status: "active",
      readBy: {
        $ne: session.user.id,
      },
    });

    return Response.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("api/alerts/count request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch notification count" },
      { status: 500 }
    );
  }
}