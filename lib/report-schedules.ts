import "server-only";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import client, { db } from "@/lib/db";
import { reportsCollection, usersCollection } from "@/lib/collections";
import { audit } from "@/lib/audit";
import { hasActiveRegion } from "@/lib/region-security";
import { hasPermission } from "@/lib/permissions";
import { generateReportSnapshot } from "@/lib/report-service";
import { reportSchedulePeriod, type ReportFrequency } from "@/lib/report-schedule-period";

export const reportSchedules = db.collection<{
  ownerId: string;
  regionId: string | null;
  title: string;
  frequency: ReportFrequency;
  enabled: boolean;
  nextRunAt: Date;
  leaseId?: string;
  leaseUntil?: Date;
}>("report_schedules");

export function reportSchedulingConfigured() {
  return (process.env.REPORT_WORKER_SECRET?.length ?? 0) >= 32;
}

export async function runScheduledReport() {
  const now = new Date();
  const leaseId = randomUUID();
  const schedule = await reportSchedules.findOneAndUpdate({
    enabled: true, nextRunAt: { $lte: now },
    $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now } }],
  }, { $set: { leaseId, leaseUntil: new Date(now.getTime() + 120_000) } },
  { sort: { nextRunAt: 1 }, returnDocument: "after" });
  if (!schedule) return "idle";
  const fence = { _id: schedule._id, leaseId, enabled: true };
  const requester = ObjectId.isValid(schedule.ownerId)
    ? await usersCollection.findOne({ _id: new ObjectId(schedule.ownerId), banned: { $ne: true } },
      { projection: { name: 1, role: 1, regionId: 1 } })
    : null;
  if (!requester || !hasPermission(requester.role, "reports:create") ||
      (requester.role === "admin" ? schedule.regionId !== null : requester.regionId !== schedule.regionId) ||
      !(await hasActiveRegion(requester))) {
    await reportSchedules.updateOne(fence, {
      $set: { enabled: false }, $unset: { leaseId: "", leaseUntil: "" },
    });
    return "paused";
  }
  const { startDate, endDate, nextRunAt } = reportSchedulePeriod(schedule.frequency, now);
  const input = { title: schedule.title, type: "surveillance_summary" as const, startDate, endDate, district: "all" };
  const snapshot = await generateReportSnapshot(input, schedule.regionId);
  return await client.withSession((session) => session.withTransaction(async () => {
    const advanced = await reportSchedules.updateOne(fence, {
      $set: { nextRunAt }, $unset: { leaseId: "", leaseUntil: "" },
    }, { session });
    if (!advanced.matchedCount) return "lease_lost";
    const outcome = await reportsCollection.insertOne({
      reportId: `RPT-${schedule._id}-${schedule.nextRunAt.getTime()}`, title: schedule.title, type: input.type,
      filters: { startDate, endDate, district: input.district }, regionId: schedule.regionId,
      generatedBy: schedule.ownerId, generatedByName: requester.name, snapshot, createdAt: now,
    }, { session });
    await audit({ actorId: schedule.ownerId, action: "report.generate.scheduled", resource: "report",
      resourceId: outcome.insertedId.toHexString(), regionId: schedule.regionId }, session);
    return "completed";
  }));
}
