import "server-only";

import type { Document } from "mongodb";

import {
  inspectionsCollection,
  usersCollection,
  alertsCollection,
} from "@/lib/collections";

import { hasPermission } from "@/lib/permissions";

import type {
  DashboardData,
  InspectionTrend,
  RecentInspection,
  PriorityAlert,
} from "@/app/types/dashboard";

interface DashboardUser {
  id: string;
  role?: string | null;
  regionId?: string | null;
}

interface DashboardAggregate {
  statistics: {
    totalInspections: number;
    verifiedDetections: number;
  }[];

  trends: {
    _id: string;
    inspections: number;
    verified: number;
  }[];

  distribution: {
    _id: string;
    value: number;
  }[];
}

function getBangladeshDate(date: Date): string {
  return new Date(
    date.getTime() + 6 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
}

function getDateRange(days: number) {
  const today = getBangladeshDate(new Date());

  const end = new Date(
    `${today}T00:00:00+06:00`
  );

  const start = new Date(end);

  start.setUTCDate(
    start.getUTCDate() - days + 1
  );

  const dates = Array.from(
    { length: days },
    (_, index) => {
      const date = new Date(start);

      date.setUTCDate(
        date.getUTCDate() + index
      );

      return getBangladeshDate(date);
    }
  );

  return {
    start,
    dates,
  };
}

export async function getDashboardData(
  user: DashboardUser,
  days: number
): Promise<DashboardData> {
  const isAdmin = user.role === "admin";

  const isFieldWorker =
    user.role === "field_worker";

  const isResearcher =
    user.role === "researcher";

  if (!isAdmin && !user.regionId) {
    throw new Error("No region assigned");
  }

  const canViewInspections = hasPermission(
    user.role,
    "inspections:view"
  );

  const canViewAlerts = hasPermission(
    user.role,
    "alerts:view"
  );

  const canViewWorkers =
    isAdmin ||
    user.role === "supervisor" ||
    user.role === "health_authority";

  const regionFilter: Document = isAdmin
    ? {}
    : {
        regionId: user.regionId,
      };

  const inspectionFilter: Document = {
    ...regionFilter,
    ...(isFieldWorker
      ? {
          inspectorId: user.id,
        }
      : {}),
  };

  const alertFilter: Document = {
    ...regionFilter,
    ...(isFieldWorker
      ? {
          assignedTo: user.id,
        }
      : {}),
  };

  const { start, dates } = getDateRange(days);

  const dateFilter: Document = {
    ...inspectionFilter,
    inspectedAt: {
      $gte: start,
      $lte: new Date(),
    },
  };

  const [
    aggregateResults,
    activeFieldWorkers,
    activeAlerts,
    recentInspections,
    priorityAlerts,
  ] = await Promise.all([
    inspectionsCollection
      .aggregate<DashboardAggregate>([
        {
          $match: dateFilter,
        },
        {
          $facet: {
            statistics: [
              {
                $group: {
                  _id: null,

                  totalInspections: {
                    $sum: 1,
                  },

                  verifiedDetections: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            {
                              $eq: [
                                "$status",
                                "verified",
                              ],
                            },
                            {
                              $eq: [
                                "$review.verifiedDetectionResult",
                                "positive",
                              ],
                            },
                          ],
                        },
                        1,
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
                      format: "%Y-%m-%d",
                      date: "$inspectedAt",
                      timezone: "Asia/Dhaka",
                    },
                  },

                  inspections: {
                    $sum: 1,
                  },

                  verified: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            "$status",
                            "verified",
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },

              {
                $sort: {
                  _id: 1,
                },
              },
            ],

            distribution: [
              {
                $match: {
                  status: "verified",

                  "review.verifiedDetectionResult": {
                    $in: [
                      "positive",
                      "negative",
                      "inconclusive",
                    ],
                  },
                },
              },

              {
                $group: {
                  _id: "$review.verifiedDetectionResult",

                  value: {
                    $sum: 1,
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray(),

    canViewWorkers
      ? usersCollection.countDocuments({
          ...regionFilter,
          role: "field_worker",
          banned: {
            $ne: true,
          },
        })
      : Promise.resolve(null),

    canViewAlerts
      ? alertsCollection.countDocuments({
          ...alertFilter,
          status: "active",
        })
      : Promise.resolve(null),

    canViewInspections && !isResearcher
      ? inspectionsCollection
          .find(dateFilter)
          .sort({
            inspectedAt: -1,
          })
          .limit(5)
          .toArray()
      : Promise.resolve([]),

    canViewAlerts
      ? alertsCollection
          .aggregate([
            {
              $match: {
                ...alertFilter,
                status: "active",

                severity: {
                  $in: ["critical", "high"],
                },
              },
            },

            {
              $addFields: {
                severityOrder: {
                  $cond: [
                    {
                      $eq: [
                        "$severity",
                        "critical",
                      ],
                    },
                    2,
                    1,
                  ],
                },
              },
            },

            {
              $sort: {
                severityOrder: -1,
                createdAt: -1,
              },
            },

            {
              $limit: 5,
            },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);

  const aggregate = aggregateResults[0];

  const statistics =
    aggregate?.statistics[0] ?? {
      totalInspections: 0,
      verifiedDetections: 0,
    };

  const trendMap = new Map(
    (aggregate?.trends ?? []).map(
      (item) => [item._id, item]
    )
  );

  const inspectionTrends: InspectionTrend[] =
    dates.map((date) => ({
      date,

      inspections:
        trendMap.get(date)?.inspections ?? 0,

      verified:
        trendMap.get(date)?.verified ?? 0,
    }));

  const distributionMap = new Map(
    (aggregate?.distribution ?? []).map(
      (item) => [item._id, item.value]
    )
  );

  const formattedInspections: RecentInspection[] =
    recentInspections.map((inspection) => ({
      _id: inspection._id.toString(),

      inspectionId: inspection.inspectionId,

      inspectorName: inspection.inspectorName,

      district: inspection.location.district,

      area: inspection.location.area,

      detectionResult:
        inspection.status === "verified"
          ? inspection.review
              ?.verifiedDetectionResult ?? null
          : null,

      status: inspection.status,

      inspectedAt: new Date(
        inspection.inspectedAt
      ).toISOString(),
    }));

  const formattedAlerts: PriorityAlert[] =
    priorityAlerts.map((alert) => ({
      _id: alert._id.toString(),

      title: alert.title,

      message: alert.message,

      severity: alert.severity,

      district: alert.location.district,

      area: alert.location.area,

      createdAt: new Date(
        alert.createdAt
      ).toISOString(),
    }));

  return {
    statistics: {
      totalInspections:
        statistics.totalInspections,

      verifiedDetections:
        statistics.verifiedDetections,

      activeFieldWorkers,

      activeAlerts,
    },

    inspectionTrends,

    detectionDistribution: [
      {
        name: "Positive",
        value:
          distributionMap.get("positive") ?? 0,
      },
      {
        name: "Negative",
        value:
          distributionMap.get("negative") ?? 0,
      },
      {
        name: "Inconclusive",
        value:
          distributionMap.get("inconclusive") ?? 0,
      },
    ],

    recentInspections: formattedInspections,

    priorityAlerts: formattedAlerts,

    access: {
      inspections:
        canViewInspections && !isResearcher,

      alerts: canViewAlerts,

      workers: canViewWorkers,
    },

    updatedAt: new Date().toISOString(),
  };
}