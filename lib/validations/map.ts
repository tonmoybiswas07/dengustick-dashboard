import { z } from "zod";

export const mapQuery = z.object({
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  region: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
  detection: z.enum(["positive", "negative", "inconclusive"]).optional(),
  status: z.enum(["pending", "under_review", "verified", "rejected"]).optional(),
}).refine(({ start, end }) => !start || !end || start <= end);
