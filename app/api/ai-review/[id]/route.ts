import { ObjectId } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";
import { reviewSchema } from "@/lib/validations/review";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { session, error } = await authorizeAPI("ai:review");

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

    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          message:
            validation.error.issues[0]?.message ||
            "Invalid review data",
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const review = {
      reviewerId: session.user.id,
      reviewerName: session.user.name,
      decision: data.decision,

      verifiedDetectionResult:
        data.decision === "verified"
          ? data.verifiedDetectionResult
          : null,

      verifiedLarvaeCount:
        data.decision === "verified"
          ? data.verifiedLarvaeCount
          : null,

      reviewNotes: data.reviewNotes,
      reviewedAt: new Date(),
    };

    const result = await inspectionsCollection.updateOne(
      {
        ...filter,
        _id: new ObjectId(id),
        status: {
          $in: ["pending", "under_review"],
        },
      },
      {
        $set: {
          status: data.decision,
          review,
          updatedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      return Response.json(
        {
          message:
            "Inspection unavailable or already reviewed",
        },
        { status: 409 }
      );
    }

    return Response.json({
      success: true,
      message:
        data.decision === "verified"
          ? "Inspection verified successfully"
          : "Inspection rejected successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { message: "Failed to submit review" },
      { status: 500 }
    );
  }
}