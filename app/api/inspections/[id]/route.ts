import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { inspectionSchema } from "@/lib/validations/inspection";
import { getInspectionFilter } from "@/lib/inspection-access";


type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:view"
    );

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const inspection = await inspectionsCollection.findOne({
      ...filter,
      _id: new ObjectId(id),
    });

    if (!inspection) {
      return Response.json(
        { message: "Inspection not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to fetch inspection" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:update"
    );

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const validation = inspectionSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message: "Invalid inspection data",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    if (
      session.user.role !== "admin" &&
      data.regionId !== session.user.regionId
    ) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const result = await inspectionsCollection.updateOne(
      {
        ...filter,
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          ...data,
          inspectedAt: new Date(data.inspectedAt),
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json(
        {
          message:
            "Inspection not found or no longer editable",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Inspection updated successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to update inspection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI(
      "inspections:delete"
    );

    if (error) return error;

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid inspection ID" },
        { status: 400 }
      );
    }

    const filter = getInspectionFilter(session.user);

    if (!filter) {
      return Response.json(
        { message: "Region access denied" },
        { status: 403 }
      );
    }

    const result = await inspectionsCollection.deleteOne({
      ...filter,
      _id: new ObjectId(id),
      status: "pending",
    });

    if (!result.deletedCount) {
      return Response.json(
        {
          message:
            "Inspection not found or cannot be deleted",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Inspection deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to delete inspection" },
      { status: 500 }
    );
  }
}