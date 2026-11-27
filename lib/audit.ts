import "server-only";

import { z } from "zod";
import type { ClientSession } from "mongodb";
import { db } from "@/lib/db";

const identifier = z.string().regex(/^[\w.:-]{1,128}$/);
const auditEvent = z.strictObject({
  actorId: identifier.nullable(),
  action: z.string().regex(/^[a-z][a-z.]{0,63}$/),
  resource: identifier,
  resourceId: identifier,
  regionId: z.string().regex(/^[a-f\d]{24}$/i).nullish(),
  outcome: z.enum(["success", "denied"]).default("success"),
  metadata: z.strictObject({
    format: z.enum(["csv", "pdf"]).optional(),
    status: z.enum(["assigned", "in_progress", "completed", "cancelled"]).optional(),
    decision: z.enum(["verified", "rejected"]).optional(),
    dashboardRange: z.enum(["7", "30", "90"]).optional(),
    positiveDetectionAlerts: z.boolean().optional(),
    overdueTaskAlerts: z.boolean().optional(),
  }).optional(),
});

export type AuditEvent = z.input<typeof auditEvent>;

export const auditCollection = db.collection<z.output<typeof auditEvent> & { timestamp: Date }>("audit_logs");

export async function audit(event: AuditEvent, session?: ClientSession) {
  try {
    await auditCollection.insertOne({ ...auditEvent.parse(event), timestamp: new Date() }, { session });
  } catch (error) {
    if (session) throw error;
    console.error("Audit event could not be recorded");
  }
}
