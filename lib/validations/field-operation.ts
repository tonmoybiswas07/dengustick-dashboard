import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(3).max(150),

  description: z.string().trim().min(5).max(2000),

  assignedTo: z.string().trim().min(1),

  location: z.object({
    address: z.string().trim().min(3),
    district: z.string().trim().min(1),
    area: z.string().trim().min(1),
  }),

  priority: z.enum([
    "low",
    "medium",
    "high",
    "urgent",
  ]),

  deadline: z.string().datetime().refine(
    (value) => new Date(value).getTime() > Date.now(),
    "Deadline must be in the future"
  ),
});

export const updateTaskSchema = z.object({
  status: z.enum([
    "in_progress",
    "completed",
    "cancelled",
  ]),

  inspectionId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional(),
});

export type CreateTaskInput = z.infer<
  typeof createTaskSchema
>;

export type UpdateTaskInput = z.infer<
  typeof updateTaskSchema
>;