import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { authorizeAPI } from "@/lib/api-auth";
import { regionsCollection } from "@/lib/collections";
import { directoryPageSize } from "@/lib/directory";
import { paginationQuery } from "@/lib/validations/query";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("inspections:create", request);
    if (error) return error;

    const result = paginationQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!result.success) return Response.json({ message: "Invalid directory page" }, { status: 400 });

    const { page } = result.data;
    const { role, regionId } = session.user;
    const filter = role === "admin" ? { isActive: true } : {
      isActive: true,
      _id: { $in: regionId && ObjectId.isValid(regionId) ? [new ObjectId(regionId)] : [] },
    };
    const rows = await regionsCollection.find(filter, {
      projection: { _id: 1, name: 1, code: 1, district: 1 },
    }).sort({ name: 1, _id: 1 })
      .skip((page - 1) * directoryPageSize)
      .limit(directoryPageSize + 1)
      .toArray();

    return Response.json({
      data: rows.slice(0, directoryPageSize).map(({ _id, name, code, district }) => ({
        id: _id.toHexString(), name, code, district,
      })),
      pagination: { hasNext: rows.length > directoryPageSize },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Inspection region directory failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ message: "Could not load inspection regions" }, { status: 500 });
  }
}
