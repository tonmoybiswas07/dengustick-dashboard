import { z } from "zod";

export const inspectionSchema = z.object({
  regionId: z.string().trim().min(1),

  location: z.object({
    address: z.string().trim().min(3),
    district: z.string().trim().min(1),
    area: z.string().trim().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),

  breedingSiteType: z.enum([
    "water_container",
    "discarded_tire",
    "flower_pot",
    "drain",
    "water_tank",
    "other",
  ]),

  images: z.array(z.string().url()).max(10).default([]),

  notes: z.string().trim().max(2000).default(""),

  inspectedAt: z.string().datetime(),
});

export type InspectionInput = z.infer<typeof inspectionSchema>;