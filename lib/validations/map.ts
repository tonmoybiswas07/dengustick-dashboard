import { z } from "zod";

const viewport = z.string().max(100)
  .regex(/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){3}$/)
  .transform((value) => value.split(",").map(Number))
  .refine(([south, west, north, east]) =>
    south >= -90 && north <= 90 && south < north &&
    west >= -180 && west <= 180 && east >= -180 && east <= 180 && west !== east,
  )
  .transform(([south, west, north, east]) => ({ south, west, north, east }));

export const mapQuery = z.object({
  viewport: viewport.optional(),
  search: z.string().trim().max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
  region: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
  detection: z.enum(["positive", "negative", "inconclusive"]).optional(),
  status: z.enum(["pending", "under_review", "verified", "rejected"]).optional(),
}).refine(({ start, end }) => !start || !end || start <= end, { path: ["end"] });
