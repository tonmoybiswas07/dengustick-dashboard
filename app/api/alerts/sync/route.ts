import { authorizeAPI } from "@/lib/api-auth";
import { syncAlerts } from "@/lib/alert-service";

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI(
      "alerts:manage", request
    );

    if (error) return error;

    const user = session.user;

    const regionId = user.regionId ?? undefined;

    if (user.role !== "admin" && !regionId) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const result = await syncAlerts(
      user.role === "admin"
        ? undefined
        : regionId
    );

    return Response.json({
      success: true,
      message: `${result.created} new alerts generated`,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to synchronize alerts" },
      { status: 500 }
    );
  }
}