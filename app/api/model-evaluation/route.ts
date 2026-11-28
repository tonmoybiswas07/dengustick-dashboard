import { z } from "zod";
import { statisticsQuery } from "@/lib/validations/query";
import { connection } from "next/server";
import type { Document } from "mongodb";

import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";

import {
    calculateMetrics,
    calculatePercentage,
} from "@/lib/model-evaluation";

import type {
    ConfusionMatrixData,
    ModelEvaluationData,
} from "@/app/types/model-evaluation";

interface EvaluationAggregate {
    totalInspections: number;
    verifiedInspections: number;
    evaluatedInspections: number;
    tp: number;
    tn: number;
    fp: number;
    fn: number;
    averageConfidence: number | null;
}

interface ConfidenceAggregate {
    _id: number;
    correct: number;
    incorrect: number;
    total: number;
}

export async function GET(request: Request) {
    await connection();

    try {
        const { session, error } = await authorizeAPI(
            "models:evaluate", request
        );

        if (error) return error;

        const { user } = session;

        const { searchParams } = new URL(request.url);

        const parsed = statisticsQuery.extend({ version: z.string().trim().min(1).max(100).optional() }).safeParse(Object.fromEntries(searchParams));
        if (!parsed.success) {
          return Response.json({ message: "Invalid query parameters" }, { status: 400 });
        }
        const { range, district, version } = parsed.data;

        const regionFilter: Document = {};

        if (user.role !== "admin") {
            if (!user.regionId) {
                return Response.json(
                    { message: "No region assigned" },
                    { status: 403 }
                );
            }

            regionFilter.regionId = user.regionId;
        }

        const filter: Document = {
            ...regionFilter,
        };

        if (district !== "all") {
            filter["location.district"] = district;
        }

        if (range !== "all") {
            filter.inspectedAt = {
                $gte: new Date(
                    Date.now() -
                    Number(range) * 24 * 60 * 60 * 1000
                ),
                $lte: new Date(),
            };
        }

        const eligibleExpression = {
            $and: [
                { $eq: ["$status", "verified"] },

                {
                    $in: [
                        "$detectionResult",
                        ["positive", "negative"],
                    ],
                },

                {
                    $in: [
                        "$review.verifiedDetectionResult",
                        ["positive", "negative"],
                    ],
                },

                { $isNumber: "$confidenceScore" },
                { $gte: ["$confidenceScore", 0] },
                { $lte: ["$confidenceScore", 1] },
            ],
        };

        function countPrediction(
            prediction: string,
            actual: string
        ) {
            return {
                $sum: {
                    $cond: [
                        {
                            $and: [
                                "$eligible",
                                {
                                    $eq: [
                                        "$detectionResult",
                                        prediction,
                                    ],
                                },
                                {
                                    $eq: [
                                        "$review.verifiedDetectionResult",
                                        actual,
                                    ],
                                },
                            ],
                        },
                        1,
                        0,
                    ],
                },
            };
        }

        const selectedFilter = version ? { ...filter, "prediction.modelVersion": version } : filter;
        const validCount = (field: string) => ({ $and: [
            { $isNumber: field }, { $gte: [field, 0] }, { $lte: [field, 1_000_000] },
        ] });
        const [results, districts, versionRows, countErrors] = await Promise.all([
            inspectionsCollection
                .aggregate<{
                    summary: EvaluationAggregate[];
                    confidence: ConfidenceAggregate[];
                }>([
                    { $match: selectedFilter },

                    {
                        $addFields: {
                            eligible: eligibleExpression,
                        },
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

                                        evaluatedInspections: {
                                            $sum: {
                                                $cond: [
                                                    "$eligible",
                                                    1,
                                                    0,
                                                ],
                                            },
                                        },

                                        tp: countPrediction(
                                            "positive",
                                            "positive"
                                        ),

                                        tn: countPrediction(
                                            "negative",
                                            "negative"
                                        ),

                                        fp: countPrediction(
                                            "positive",
                                            "negative"
                                        ),

                                        fn: countPrediction(
                                            "negative",
                                            "positive"
                                        ),

                                        averageConfidence: {
                                            $avg: {
                                                $cond: [
                                                    "$eligible",
                                                    "$confidenceScore",
                                                    null,
                                                ],
                                            },
                                        },
                                    },
                                },
                            ],

                            confidence: [
                                {
                                    $match: {
                                        eligible: true,
                                    },
                                },

                                {
                                    $group: {
                                        _id: {
                                            $min: [
                                                4,
                                                {
                                                    $floor: {
                                                        $multiply: [
                                                            "$confidenceScore",
                                                            5,
                                                        ],
                                                    },
                                                },
                                            ],
                                        },

                                        correct: {
                                            $sum: {
                                                $cond: [
                                                    {
                                                        $eq: [
                                                            "$detectionResult",
                                                            "$review.verifiedDetectionResult",
                                                        ],
                                                    },
                                                    1,
                                                    0,
                                                ],
                                            },
                                        },

                                        incorrect: {
                                            $sum: {
                                                $cond: [
                                                    {
                                                        $ne: [
                                                            "$detectionResult",
                                                            "$review.verifiedDetectionResult",
                                                        ],
                                                    },
                                                    1,
                                                    0,
                                                ],
                                            },
                                        },

                                        total: {
                                            $sum: 1,
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ])
                .toArray(),

            inspectionsCollection.distinct(
                "location.district",
                regionFilter
            ),
            inspectionsCollection.aggregate<{ _id: string; eligible: number; correct: number }>([
                { $match: { ...filter, "prediction.modelVersion": { $type: "string" } } },
                { $match: { $expr: eligibleExpression } },
                { $group: { _id: "$prediction.modelVersion", eligible: { $sum: 1 },
                    correct: { $sum: { $cond: [{ $eq: ["$detectionResult", "$review.verifiedDetectionResult"] }, 1, 0] } },
                } },
                { $sort: { eligible: -1, _id: 1 } }, { $limit: 20 },
            ], { maxTimeMS: 5000 }).toArray(),
            inspectionsCollection.aggregate<{ samples: number; mae: number; rmse: number }>([
                { $match: { ...selectedFilter, status: "verified", "prediction.modelVersion": { $type: "string", ...(version && { $eq: version }) } } },
                { $match: { $expr: { $and: [validCount("$prediction.larvaeCount"), validCount("$review.verifiedLarvaeCount")] } } },
                { $project: { difference: { $subtract: ["$prediction.larvaeCount", "$review.verifiedLarvaeCount"] } } },
                { $group: { _id: null, samples: { $sum: 1 }, mae: { $avg: { $abs: "$difference" } },
                    mse: { $avg: { $multiply: ["$difference", "$difference"] } },
                } },
                { $project: { _id: 0, samples: 1, mae: 1, rmse: { $sqrt: "$mse" } } },
            ], { maxTimeMS: 5000 }).next(),
        ]);

        const result = results[0];

        const summary = result?.summary[0] ?? {
            totalInspections: 0,
            verifiedInspections: 0,
            evaluatedInspections: 0,
            tp: 0,
            tn: 0,
            fp: 0,
            fn: 0,
            averageConfidence: null,
        };

        const confusionMatrix: ConfusionMatrixData = {
            tp: summary.tp,
            tn: summary.tn,
            fp: summary.fp,
            fn: summary.fn,
        };

        const ranges = [
            "0–<20%",
            "20–<40%",
            "40–<60%",
            "60–<80%",
            "80–100%",
        ];

        const confidenceDistribution = ranges.map(
            (range, index) => {
                const item = result?.confidence.find(
                    (entry) => entry._id === index
                );

                return {
                    range,
                    correct: item?.correct ?? 0,
                    incorrect: item?.incorrect ?? 0,
                    total: item?.total ?? 0,
                };
            }
        );

        const data: ModelEvaluationData = {
            versions: versionRows.map((row) => ({ version: row._id, eligible: row.eligible, accuracy: calculatePercentage(row.correct, row.eligible) })),
            countErrors,
            metrics: calculateMetrics(confusionMatrix),

            confusionMatrix,

            summary: {
                totalInspections:
                    summary.totalInspections,

                verifiedInspections:
                    summary.verifiedInspections,

                evaluatedInspections:
                    summary.evaluatedInspections,

                excludedInspections:
                    summary.verifiedInspections -
                    summary.evaluatedInspections,

                correctPredictions:
                    summary.tp + summary.tn,

                incorrectPredictions:
                    summary.fp + summary.fn,

                averageConfidence:
                    summary.averageConfidence === null
                        ? null
                        : Number(
                            (
                                summary.averageConfidence * 100
                            ).toFixed(2)
                        ),

                coverage: calculatePercentage(
                    summary.evaluatedInspections,
                    summary.verifiedInspections
                ),
            },

            confidenceDistribution,

            predictionComparison: [
                {
                    name: "Positive",
                    ai: summary.tp + summary.fp,
                    manual: summary.tp + summary.fn,
                },
                {
                    name: "Negative",
                    ai: summary.tn + summary.fn,
                    manual: summary.tn + summary.fp,
                },
            ],

            availableDistricts: districts
                .filter(
                    (value): value is string =>
                        typeof value === "string" &&
                        value.length > 0
                )
                .sort(),
        };

        return Response.json(
            {
                success: true,
                data,
            },
            {
                headers: {
                    "Cache-Control": "private, no-store",
                },
            }
        );
    } catch (error) {
        console.error("api/model-evaluation request failed", error instanceof Error ? error.name : "UnknownError");

        return Response.json(
            {
                message: "Failed to evaluate model performance",
            },
            { status: 500 }
        );
    }
}