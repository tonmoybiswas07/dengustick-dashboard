import { searchQuery } from "@/lib/validations/query";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { connection } from "next/server";
import { MongoServerError, ObjectId } from "mongodb";
import client, { db } from "@/lib/db";
import { lockRegion } from "@/lib/region-security";

import { getAuth } from "@/lib/auth";
import { authorizeAdmin } from "@/lib/admin-access";

import { usersCollection } from "@/lib/collections";

import {
  createUserSchema,
} from "@/lib/validations/administration";

export async function GET(request: Request) {
  await connection();

  try {
    const { error } = await authorizeAdmin(request);

    if (error) return error;

    const { searchParams } = new URL(request.url);

    const parsed = searchQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return Response.json({ message: "Invalid query parameters" }, { status: 400 });
    }
    const { page, search } = parsed.data;

    const escapedSearch = search.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

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
        totalPages: Math.min(1000, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("api/administration/users request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAdmin(request);

    if (error) return error;

    const body = await readJSON(request);

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

    const email = data.email.toLowerCase();
    const regionId = data.role === "admin" ? null : data.regionId;
    const id = new ObjectId();
    const now = new Date();
    const password = await (await getAuth().$context).password.hash(data.password);

    const outcome = await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      if (regionId && !(await lockRegion(dbSession, regionId))) return "inactive";
      if (await usersCollection.findOne({ email }, { session: dbSession, projection: { _id: 1 } })) return "duplicate";
      await usersCollection.insertOne({
        _id: id, email, name: data.name, role: data.role, regionId,
        emailVerified: false, banned: false, createdAt: now, updatedAt: now,
      }, { session: dbSession });
      // Better Auth's Mongo adapter stores the credential account's foreign key as an ObjectId.
      await db.collection("account").insertOne({
        userId: id, accountId: id.toHexString(), providerId: "credential",
        password, createdAt: now, updatedAt: now,
      }, { session: dbSession });
      await audit({ actorId: session.user.id, action: "user.create", resource: "user", resourceId: id.toHexString(), regionId }, dbSession);
      return "created";
    }));
    if (outcome === "inactive") return Response.json({ message: "Select a valid active region" }, { status: 409 });
    if (outcome === "duplicate") return Response.json({ message: "Email already exists" }, { status: 409 });

    return Response.json(
      {
        success: true,
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json({ message: "Email already exists" }, { status: 409 });
    }
    console.error("api/administration/users request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
}