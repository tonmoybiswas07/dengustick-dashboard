import "server-only";

import { z } from "zod";
import { auditCollection } from "@/lib/audit";

const filters = z.object({
  action: z.union([z.literal(""), z.string().regex(/^[a-z][a-z.]{0,63}$/)]).optional(),
  actor: z.union([z.literal(""), z.string().regex(/^[a-fA-F0-9]{24}$/)]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export async function queryAudit(input: unknown) {
  const result = filters.safeParse(input);
  if (!result.success) return null;
  const { action, actor, page } = result.data;
  const filter = { ...(action && { action }), ...(actor && { actorId: actor.toLowerCase() }) };
  const limit = 25;
  const rows = await auditCollection.find(filter)
    .sort({ timestamp: -1, _id: -1 }).skip((page - 1) * limit).limit(limit + 1).toArray();
  return { page, hasNext: page < 1000 && rows.length > limit, rows: rows.slice(0, limit) };
}
