import { z } from "zod";

const roleSchema = z.enum([
  "admin",
  "health_authority",
  "supervisor",
  "field_worker",
  "researcher",
]);

const regionIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .nullable();

export const createUserSchema = z
  .object({
    name: z.string().trim().min(3).max(100),

    email: z.string().trim().email(),

    password: z.string().min(8).max(128),

    role: roleSchema,

    regionId: regionIdSchema,
  })
  .refine(
    (data) =>
      data.role === "admin" ||
      data.regionId !== null,
    {
      message: "Region is required for non-admin users",
      path: ["regionId"],
    }
  );

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(100),

    role: roleSchema,

    regionId: regionIdSchema,

    banned: z.boolean(),
  })
  .refine(
    (data) =>
      data.role === "admin" ||
      data.regionId !== null,
    {
      message: "Region is required for non-admin users",
      path: ["regionId"],
    }
  );

export const regionSchema = z.object({
  name: z.string().trim().min(3).max(100),

  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase()),

  district: z.string().trim().min(2).max(100),

  division: z.enum([
    "Dhaka",
    "Chattogram",
    "Rajshahi",
    "Khulna",
    "Barishal",
    "Sylhet",
    "Rangpur",
    "Mymensingh",
  ]),

  description: z.string().trim().max(1000).default(""),

  isActive: z.boolean().default(true),
});