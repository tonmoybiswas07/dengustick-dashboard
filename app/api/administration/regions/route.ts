import { directoryPageSize } from "@/lib/directory";
import { paginationQuery } from "@/lib/validations/query";
import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { connection } from "next/server";
import { MongoServerError } from "mongodb";
import { authorizeAdmin } from "@/lib/admin-access";
import { regionsCollection } from "@/lib/collections";
import { regionSchema } from "@/lib/validations/administration";

export async function GET(request: Request) {
  await connection();

  try {
    const { error } = await authorizeAdmin(request);

    if (error) return error;

    const parsed = paginationQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ message: "Invalid directory page" }, { status: 400 });
    const { page } = parsed.data;

    const regions = await regionsCollection
      .find({}, { projection: { lifecycleVersion: 0 } })
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * directoryPageSize)
      .limit(directoryPageSize + 1)
      .toArray();

    return Response.json({
      success: true,
      pagination: { page, hasNext: regions.length > directoryPageSize },
      data: regions.slice(0, directoryPageSize).map((region) => ({ ...region, _id: region._id.toHexString() })),
    });
  } catch (error) {
    console.error("api/administration/regions request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAdmin(request);

    if (error) return error;

    const body = await readJSON(request);

    const validation = regionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existing = await regionsCollection.findOne({
      code: data.code,
    });

    if (existing) {
      return Response.json(
        { message: "Region code already exists" },
        { status: 409 }
      );
    }

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const created = await regionsCollection.insertOne({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { session: dbSession });

      await audit({ actorId: session.user.id, action: "region.create", resource: "region", resourceId: created.insertedId.toHexString(), regionId: created.insertedId.toHexString() }, dbSession);

      return Response.json(
        {
          success: true,
          message: "Region created successfully",
        },
        { status: 201 }
      );
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    if (
      error instanceof MongoServerError &&
      error.code === 11000 &&
      error.keyPattern?.code === 1
    ) {
      return Response.json(
        { message: "Region code already exists" },
        { status: 409 }
      );
    }

    console.error("api/administration/regions request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to create region" },
      { status: 500 }
    );
  }
}