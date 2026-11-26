import { connection } from "next/server";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { authorizeAdmin } from "@/lib/admin-access";

import {
  usersCollection,
  regionsCollection,
} from "@/lib/collections";

import {
  createUserSchema,
} from "@/lib/validations/administration";

export async function GET(request: Request) {
  await connection();

  try {
    const { error } = await authorizeAdmin();

    if (error) return error;

    const { searchParams } = new URL(request.url);

    const search = (
      searchParams.get("search") ?? ""
    ).trim().slice(0, 100);

    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const rawPage = Number(
      searchParams.get("page") ?? 1
    );

    const page = Number.isSafeInteger(rawPage)
      ? Math.max(1, Math.min(rawPage, 100000))
      : 1;

    const limit = 10;

    const filter = search
      ? {
          $or: [
            {
              name: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
            {
              email: {
                $regex: escapedSearch,
                $options: "i",
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      usersCollection
        .find(filter)
        .project({
          name: 1,
          email: 1,
          role: 1,
          regionId: 1,
          image: 1,
          emailVerified: 1,
          banned: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),

      usersCollection.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      data: users.map((user) => ({ ...user, _id: user._id.toHexString() })),

      pagination: {
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await authorizeAdmin(request);

    if (error) return error;

    const body = await request.json().catch(() => null);

    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (data.role !== "admin" && data.regionId) {
      const region = await regionsCollection.findOne({
        _id: new ObjectId(data.regionId),
        isActive: true,
      });

      if (!region) {
        return Response.json(
          { message: "Select a valid active region" },
          { status: 400 }
        );
      }
    }

    const email = data.email.toLowerCase();

    const existingUser = await usersCollection.findOne({
      email,
    });

    if (existingUser) {
      return Response.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    await auth.api.createUser({
      headers: await headers(),

      body: {
        name: data.name,
        email,
        password: data.password,
        role: data.role,

        data: {
          regionId:
            data.role === "admin"
              ? null
              : data.regionId,
        },
      },
    });

    return Response.json(
      {
        success: true,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}