import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
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
    const { session, error } = await authorizeAPI("ai:review", request);

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

    const body = await readJSON(request);

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

    return await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const reviewed = await inspectionsCollection.findOneAndUpdate(
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
        },
        { projection: { regionId: 1 }, session: dbSession },
      );

      if (!reviewed) {
        return Response.json(
          {
            message:
              "Inspection unavailable or already reviewed",
          },
          { status: 409 }
        );
      }

      await audit({ actorId: session.user.id, action: "inspection.review", resource: "inspection", resourceId: id, regionId: reviewed.regionId, metadata: { decision: data.decision } }, dbSession);

      return Response.json({
        success: true,
        message:
          data.decision === "verified"
            ? "Inspection verified successfully"
            : "Inspection rejected successfully",
      });
    }));
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    console.error("api/ai-review/[id] request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to submit review" },
      { status: 500 }
    );
  }
}