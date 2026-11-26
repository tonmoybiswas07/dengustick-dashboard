import { connection } from "next/server";
import { MongoServerError } from "mongodb";
import { authorizeAdmin } from "@/lib/admin-access";
import { regionsCollection } from "@/lib/collections";
import { regionSchema } from "@/lib/validations/administration";

export async function GET() {
  await connection();

  try {
    const { error } = await authorizeAdmin();

    if (error) return error;

    const regions = await regionsCollection
      .find()
      .sort({ name: 1 })
      .toArray();

    return Response.json({
      success: true,
      data: regions.map((region) => ({ ...region, _id: region._id.toHexString() })),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await authorizeAdmin(request);

    if (error) return error;

    const body = await request.json().catch(() => null);

    const validation = regionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    await regionsCollection.createIndex(
      { code: 1 },
      { unique: true }
    );

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

    await regionsCollection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Response.json(
      {
        success: true,
        message: "Region created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
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

    console.error(error);

    return Response.json(
      { message: "Failed to create region" },
      { status: 500 }
    );
  }
}