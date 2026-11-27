import { connection } from "next/server";
import { authorizeAdmin } from "@/lib/admin-access";

import {
  usersCollection,
  regionsCollection,
} from "@/lib/collections";

export async function GET(request: Request) {
  await connection();

  try {
    const { error } = await authorizeAdmin(request);

    if (error) return error;

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      fieldWorkers,
      totalRegions,
      activeRegions,
    ] = await Promise.all([
      usersCollection.countDocuments(),

      usersCollection.countDocuments({
        banned: { $ne: true },
      }),

      usersCollection.countDocuments({
        banned: true,
      }),

      usersCollection.countDocuments({
        role: "field_worker",
      }),

      regionsCollection.countDocuments(),

      regionsCollection.countDocuments({
        isActive: true,
      }),
    ]);

    return Response.json({
      success: true,

      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        fieldWorkers,
        totalRegions,
        activeRegions,
      },
    });
  } catch (error) {
    console.error("api/administration/stats request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}