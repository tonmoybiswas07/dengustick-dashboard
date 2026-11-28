import { inspectionImagePath, maxInspectionImages } from "../inspection-image-reference.mjs";
import { z } from "zod";

export const inspectionSchema = z.object({
  regionId: z.string().trim().min(1).max(100),

  location: z.object({
    address: z.string().trim().min(3).max(300),
    district: z.string().trim().min(1).max(100),
    area: z.string().trim().min(1).max(100),
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

  images: z.array(z.union([z.string().regex(inspectionImagePath), z.url({ protocol: /^https$/ }).max(2048).refine((value) => {
    const url = URL.parse(value);
    return !!url && !url.username && !url.password;
  }, "Use an HTTPS image URL without credentials")])).max(maxInspectionImages).default([]),

  notes: z.string().trim().max(2000).default(""),

  inspectedAt: z.iso.datetime().refine((value) => Date.parse(value) <= Date.now(), "Inspection date cannot be in the future"),
});

export type InspectionInput = z.infer<typeof inspectionSchema>;