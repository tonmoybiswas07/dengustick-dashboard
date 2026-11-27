import { statisticsQuery } from "@/lib/validations/query";
import { connection } from "next/server";
import type { Filter } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";

import type { Inspection } from "@/app/types/inspection";
import type { AnalyticsData } from "@/app/types/analytics";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI(
      "analytics:view", request
    );

    if (error) return error;

    const user = session.user;

    const accessFilter: Filter<
      Omit<Inspection, "_id">
    > = {};

    if (user.role !== "admin") {
      if (!user.regionId) {
        return Response.json(
          { message: "Region access denied" },
          { status: 403 }
        );
      }

      accessFilter.regionId = user.regionId;
    }

    const { searchParams } = new URL(request.url);

    const parsed = statisticsQuery.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return Response.json({ message: "Invalid query parameters" }, { status: 400 });
    }
    const { range, district } = parsed.data;

    const filter: Filter<Omit<Inspection, "_id">> = {
      ...accessFilter,
    };

    if (range !== "all") {
      const startDate = new Date(
        Date.now() - Number(range) * 86400000
      );

      filter.inspectedAt = {
        $gte: startDate,
        $lte: new Date(),
      };
    }

    if (district !== "all") {
      filter["location.district"] = district;
    }

    const isVerified = {
      $eq: ["$status", "verified"],
    };

    const isPositive = {
      $and: [
        isVerified,
        {
          $eq: [
            "$review.verifiedDetectionResult",
            "positive",
          ],
        },
      ],
    };

    const isNegative = {
      $and: [
        isVerified,
        {
          $eq: [
            "$review.verifiedDetectionResult",
            "negative",
          ],
        },
      ],
    };

    const isInconclusive = {
      $and: [
        isVerified,
        {
          $eq: [
            "$review.verifiedDetectionResult",
            "inconclusive",
          ],
        },
      ],
    };

    const trendFormat =
      range === "365" || range === "all"
        ? "%Y-%m"
        : "%Y-%m-%d";

    const [results, availableDistricts] =
      await Promise.all([
        inspectionsCollection
          .aggregate([
            {
              $match: filter,
            },
            {
              $facet: {
                summary: [
                  {
                    $group: {
                      _id: null,

                      totalInspections: {
                        $sum: 1,
                      },

                      verifiedInspections: {
                        $sum: {
                          $cond: [isVerified, 1, 0],
                        },
                      },

                      positiveDetections: {
                        $sum: {
                          $cond: [isPositive, 1, 0],
                        },
                      },

                      negativeDetections: {
                        $sum: {
                          $cond: [isNegative, 1, 0],
                        },
                      },

                      inconclusiveDetections: {
                        $sum: {
                          $cond: [
                            isInconclusive,
                            1,
                            0,
                          ],
                        },
                      },

                      pendingInspections: {
                        $sum: {
                          $cond: [
                            {
                              $in: [
                                "$status",
                                [
                                  "pending",
                                  "under_review",
                                ],
                              ],
                            },
                            1,
                            0,
                          ],
                        },
                      },

                      rejectedInspections: {
                        $sum: {
                          $cond: [
                            {
                              $eq: [
                                "$status",
                                "rejected",
                              ],
                            },
                            1,
                            0,
                          ],
                        },
                      },

                      totalLarvae: {
                        $sum: {
                          $cond: [
                            isPositive,
                            {
                              $ifNull: [
                                "$review.verifiedLarvaeCount",
                                0,
                              ],
                            },
                            0,
                          ],
                        },
                      },
                    },
                  },
                ],

                trends: [
                  {
                    $group: {
                      _id: {
                        $dateToString: {
                          format: trendFormat,
                          date: "$inspectedAt",
                          timezone: "Asia/Dhaka",
                        },
                      },

                      inspections: {
                        $sum: 1,
                      },

                      verified: {
                        $sum: {
                          $cond: [isVerified, 1, 0],
                        },
                      },

                      positive: {
                        $sum: {
                          $cond: [isPositive, 1, 0],
                        },
                      },
                    },
                  },
                  {
                    $sort: { _id: 1 },
                  },
                  {
                    $project: {
                      _id: 0,
                      date: "$_id",
                      inspections: 1,
                      verified: 1,
                      positive: 1,
                    },
                  },
                ],

                districts: [
                  {
                    $group: {
                      _id: "$location.district",

                      total: {
                        $sum: 1,
                      },

                      verified: {
                        $sum: {
                          $cond: [isVerified, 1, 0],
                        },
                      },

                      positive: {
                        $sum: {
                          $cond: [isPositive, 1, 0],
                        },
                      },

                      negative: {
                        $sum: {
                          $cond: [isNegative, 1, 0],
                        },
                      },
                    },
                  },
                  {
                    $sort: { total: -1 },
                  },
                  {
                    $project: {
                      _id: 0,
                      district: "$_id",
                      total: 1,
                      verified: 1,
                      positive: 1,
                      negative: 1,
                    },
                  },
                ],

                breedingSites: [
                  {
                    $group: {
                      _id: "$breedingSiteType",

                      total: {
                        $sum: 1,
                      },

                      positive: {
                        $sum: {
                          $cond: [isPositive, 1, 0],
                        },
                      },
                    },
                  },
                  {
                    $sort: { total: -1 },
                  },
                  {
                    $project: {
                      _id: 0,
                      type: "$_id",
                      total: 1,
                      positive: 1,
                    },
                  },
                ],

                ...(user.role !== "researcher" && { workers: [
                  {
                    $sort: { inspectedAt: -1 },
                  },
                  {
                    $group: {
                      _id: "$inspectorId",

                      inspectorName: {
                        $first: "$inspectorName",
                      },

                      totalInspections: {
                        $sum: 1,
                      },

                      verifiedInspections: {
                        $sum: {
                          $cond: [isVerified, 1, 0],
                        },
                      },

                      positiveDetections: {
                        $sum: {
                          $cond: [isPositive, 1, 0],
                        },
                      },
                    },
                  },
                  {
                    $sort: {
                      totalInspections: -1,
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      inspectorId: "$_id",
                      inspectorName: 1,
                      totalInspections: 1,
                      verifiedInspections: 1,
                      positiveDetections: 1,

                      verificationRate: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  "$verifiedInspections",
                                  "$totalInspections",
                                ],
                              },
                              100,
                            ],
                          },
                          1,
                        ],
                      },
                    },
                  },
                ] }),
              },
            },
          ])
          .toArray(),

        inspectionsCollection.distinct(
          "location.district",
          accessFilter
        ),
      ]);

    const result = results[0];

    const summary = result?.summary?.[0] ?? {
      totalInspections: 0,
      verifiedInspections: 0,
      positiveDetections: 0,
      negativeDetections: 0,
      inconclusiveDetections: 0,
      pendingInspections: 0,
      rejectedInspections: 0,
      totalLarvae: 0,
    };

    const conclusiveDetections =
      summary.positiveDetections +
      summary.negativeDetections;

    const positiveRate =
      conclusiveDetections > 0
        ? Number(
            (
              (summary.positiveDetections /
                conclusiveDetections) *
              100
            ).toFixed(1)
          )
        : null;

    const data: AnalyticsData = {
      summary: {
        totalInspections: summary.totalInspections,
        verifiedInspections: summary.verifiedInspections,
        positiveDetections: summary.positiveDetections,
        negativeDetections: summary.negativeDetections,
        inconclusiveDetections:
          summary.inconclusiveDetections,
        pendingInspections: summary.pendingInspections,
        rejectedInspections: summary.rejectedInspections,
        totalLarvae: summary.totalLarvae,
        positiveRate,
      },

      trends: result?.trends ?? [],

      detectionDistribution: [
        {
          name: "Positive",
          value: summary.positiveDetections,
        },
        {
          name: "Negative",
          value: summary.negativeDetections,
        },
        {
          name: "Inconclusive",
          value: summary.inconclusiveDetections,
        },
      ],

      districts: result?.districts ?? [],
      breedingSites: result?.breedingSites ?? [],

      workers:
        user.role === "researcher"
          ? []
          : result?.workers ?? [],

      availableDistricts: availableDistricts
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .sort(),
    };

    return Response.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("api/analytics request failed", error instanceof Error ? error.name : "UnknownError");

    return Response.json(
      { message: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}