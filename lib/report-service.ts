import "server-only";

import {
  inspectionsCollection,
  fieldTasksCollection,
} from "@/lib/collections";

import type { ReportSnapshot } from "@/app/types/report";
import type { GenerateReportInput } from "@/lib/validations/report";

export async function generateReportSnapshot(
  input: GenerateReportInput,
  regionId: string | null
): Promise<ReportSnapshot> {
  const start = new Date(
    `${input.startDate}T00:00:00+06:00`
  );

  const end = new Date(
    `${input.endDate}T00:00:00+06:00`
  );

  end.setTime(end.getTime() + 86400000);

  const scope = {
    ...(regionId ? { regionId } : {}),

    ...(input.district !== "all"
      ? { "location.district": input.district }
      : {}),
  };

  if (input.type === "field_operations") {
    const result = await fieldTasksCollection
      .aggregate([
        {
          $match: {
            ...scope,
            createdAt: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: "$location.district",

            total: { $sum: 1 },

            assigned: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "assigned"] },
                  1,
                  0,
                ],
              },
            },

            inProgress: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "in_progress"] },
                  1,
                  0,
                ],
              },
            },

            completed: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "completed"] },
                  1,
                  0,
                ],
              },
            },

            cancelled: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "cancelled"] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $sort: { total: -1 },
        },
      ])
      .toArray();

    const total = result.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const completed = result.reduce(
      (sum, item) => sum + item.completed,
      0
    );

    return {
      metrics: [
        { label: "Total Tasks", value: total },

        {
          label: "Completed Tasks",
          value: completed,
        },

        {
          label: "Completion Rate",
          value:
            total > 0
              ? `${((completed / total) * 100).toFixed(1)}%`
              : "N/A",
        },
      ],

      columns: [
        "District",
        "Total",
        "Assigned",
        "In Progress",
        "Completed",
        "Cancelled",
      ],

      rows: result.map((item) => [
        item._id ?? "Unknown",
        item.total,
        item.assigned,
        item.inProgress,
        item.completed,
        item.cancelled,
      ]),
    };
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

  const result = await inspectionsCollection
    .aggregate([
      {
        $match: {
          ...scope,

          inspectedAt: {
            $gte: start,
            $lt: end,
          },

          ...(input.type === "verified_detection"
            ? { status: "verified" }
            : {}),
        },
      },
      {
        $group: {
          _id: "$location.district",

          total: { $sum: 1 },

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

          inconclusive: {
            $sum: {
              $cond: [isInconclusive, 1, 0],
            },
          },

          larvae: {
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
      {
        $sort: { total: -1 },
      },
    ])
    .toArray();

  const summary = result.reduce(
    (acc, item) => ({
      total: acc.total + item.total,
      verified: acc.verified + item.verified,
      positive: acc.positive + item.positive,
      negative: acc.negative + item.negative,
      inconclusive:
        acc.inconclusive + item.inconclusive,
      larvae: acc.larvae + item.larvae,
    }),
    {
      total: 0,
      verified: 0,
      positive: 0,
      negative: 0,
      inconclusive: 0,
      larvae: 0,
    }
  );

  const conclusive =
    summary.positive + summary.negative;

  const positiveRate =
    conclusive > 0
      ? `${(
          (summary.positive / conclusive) *
          100
        ).toFixed(1)}%`
      : "N/A";

  return {
    metrics: [
      {
        label: "Total Inspections",
        value: summary.total,
      },
      {
        label: "Verified Inspections",
        value: summary.verified,
      },
      {
        label: "Positive Detections",
        value: summary.positive,
      },
      {
        label: "Negative Detections",
        value: summary.negative,
      },
      {
        label: "Inconclusive",
        value: summary.inconclusive,
      },
      {
        label: "Positive Rate",
        value: positiveRate,
      },
      {
        label: "Recorded Larvae",
        value: summary.larvae,
      },
    ],

    columns: [
      "District",
      "Total",
      "Verified",
      "Positive",
      "Negative",
      "Inconclusive",
      "Larvae",
    ],

    rows: result.map((item) => [
      item._id ?? "Unknown",
      item.total,
      item.verified,
      item.positive,
      item.negative,
      item.inconclusive,
      item.larvae,
    ]),
  };
}