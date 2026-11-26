import { z } from "zod";

export const reviewSchema = z
  .object({
    decision: z.enum(["verified", "rejected"]),

    verifiedDetectionResult: z
      .enum(["positive", "negative", "inconclusive"])
      .nullable(),

    verifiedLarvaeCount: z
      .number()
      .int()
      .min(0)
      .nullable(),

    reviewNotes: z.string().trim().min(5).max(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.decision === "verified" &&
      data.verifiedDetectionResult === null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedDetectionResult"],
        message: "Verified detection result is required",
      });
    }

    if (
      data.verifiedDetectionResult === "negative" &&
      data.verifiedLarvaeCount !== null &&
      data.verifiedLarvaeCount !== 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedLarvaeCount"],
        message: "Negative detection cannot have a positive larvae count",
      });
    }

    if (
      data.verifiedDetectionResult === "positive" &&
      data.verifiedLarvaeCount === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedLarvaeCount"],
        message: "Positive detection cannot have zero larvae",
      });
    }
  });

export type ReviewInput = z.infer<typeof reviewSchema>;