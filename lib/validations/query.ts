import { z } from "zod";

const positiveInteger = z.string().regex(/^[1-9]\d{0,3}$/).transform(Number);

export const paginationQuery = z.object({
  page: positiveInteger.pipe(z.number().max(1000)).optional().transform((value) => value ?? 1),
});

export const searchQuery = paginationQuery.extend({
  search: z.string().trim().max(100).default(""),
});

export const inspectionQuery = searchQuery.extend({
  limit: positiveInteger.pipe(z.number().max(100)).optional().transform((value) => value ?? 10),
  status: z.enum(["all", "pending", "under_review", "verified", "rejected"]).default("all"),
});

export const reviewQuery = paginationQuery.extend({
  status: z.enum(["all", "pending", "verified", "rejected"]).default("pending"),
});

export const alertQuery = paginationQuery.extend({
  status: z.enum(["all", "active", "resolved", "unread"]).default("all"),
  severity: z.enum(["all", "low", "medium", "high", "critical"]).default("all"),
});

export const taskQuery = paginationQuery.extend({
  status: z.enum(["all", "assigned", "in_progress", "completed", "cancelled"]).default("all"),
});

export const statisticsQuery = z.object({
  range: z.enum(["7", "30", "90", "365", "all"]).default("30"),
  district: z.string().trim().min(1).max(100).default("all"),
});

export const analyticsDateQuery = statisticsQuery.extend({
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
}).refine(({ start, end }) => !start && !end ||
  !!start && !!end && start <= end && Date.parse(end) - Date.parse(start) <= 365 * 86_400_000);
