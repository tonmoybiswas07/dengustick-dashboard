import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);

    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Invalid date");

export const generateReportSchema = z
  .object({
    title: z.string().trim().min(3).max(150),

    type: z.enum([
      "surveillance_summary",
      "verified_detection",
      "field_operations",
    ]),

    startDate: dateSchema,
    endDate: dateSchema,

    district: z.string().trim().min(1).max(100),
  })
  .superRefine((data, ctx) => {
    const start = new Date(
      `${data.startDate}T00:00:00+06:00`
    );

    const end = new Date(
      `${data.endDate}T00:00:00+06:00`
    );

    if (start > end) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be after start date",
      });
    }

    if (
      end.getTime() - start.getTime() >
      365 * 86400000
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Maximum report range is 366 days",
      });
    }
  });

export type GenerateReportInput = z.infer<
  typeof generateReportSchema
>;