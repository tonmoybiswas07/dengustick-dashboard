import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { connection } from "next/server";
import { MongoServerError, ObjectId } from "mongodb";
import { z } from "zod";
import { authorizeAPI } from "@/lib/api-auth";
import { reportSchedules, reportSchedulingConfigured } from "@/lib/report-schedules";
import { reportSchedulePeriod } from "@/lib/report-schedule-period";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";

const create = z.strictObject({
  title: z.string().trim().min(3).max(100),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});
const change = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/), enabled: z.boolean() });

export async function GET(request: Request) {
  await connection();
  try {
    const { session, error } = await authorizeAPI("reports:create", request);
    if (error) return error;
    if (!reportSchedulingConfigured()) return Response.json({ configured: false, data: [] });
    const items = await reportSchedules.find({ ownerId: session.user.id,
      regionId: session.user.role === "admin" ? null : session.user.regionId ?? "",
    }).project({ title: 1, frequency: 1, enabled: 1, nextRunAt: 1 }).sort({ title: 1 }).limit(100).toArray();
    return Response.json({ configured: true, data: items });
  } catch {
    return Response.json({ message: "Could not load report schedules" }, { status: 503 });
  }
}

async function mutate(request: Request, creating: boolean) {
  try {
    const { session, error } = await authorizeAPI("reports:create", request);
    if (error) return error;
    if (!reportSchedulingConfigured()) return Response.json({ message: "Scheduling is unavailable" }, { status: 503 });
    const scope = { ownerId: session.user.id, regionId: session.user.role === "admin" ? null : session.user.regionId ?? "" };
    const body = await readJSON(request);
    if (creating) {
      const parsed = create.safeParse(body);
      if (!parsed.success) return Response.json({ message: "Invalid schedule" }, { status: 400 });
      if (await reportSchedules.countDocuments(scope, { limit: 100 }) >= 100) {
        return Response.json({ message: "Schedule limit reached" }, { status: 409 });
      }
      const nextRunAt = reportSchedulePeriod(parsed.data.frequency, new Date()).nextRunAt;
      await client.withSession((dbSession) => dbSession.withTransaction(async () => {
        const inserted = await reportSchedules.insertOne({ ...scope, ...parsed.data, nextRunAt, enabled: true }, { session: dbSession });
        await audit({ actorId: scope.ownerId, action: "report.schedule.create", resource: "report_schedule",
          resourceId: inserted.insertedId.toHexString(), regionId: scope.regionId }, dbSession);
      }));
      return new Response(null, { status: 201 });
    }
    const parsed = change.safeParse(body);
    if (!parsed.success) return Response.json({ message: "Invalid schedule change" }, { status: 400 });
    const filter = { ...scope, _id: new ObjectId(parsed.data.id) };
    const schedule = await reportSchedules.findOne(filter);
    if (!schedule) return new Response(null, { status: 404 });
    const updated = await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const result = await reportSchedules.updateOne({ ...filter, enabled: schedule.enabled }, {
        $set: { enabled: parsed.data.enabled, ...(parsed.data.enabled && !schedule.enabled && {
          nextRunAt: reportSchedulePeriod(schedule.frequency, new Date()).nextRunAt,
        }) }, ...(!parsed.data.enabled && { $unset: { leaseId: "", leaseUntil: "" } }),
      }, { session: dbSession });
      if (!result.matchedCount) return false;
      await audit({ actorId: scope.ownerId, action: "report.schedule.update", resource: "report_schedule",
        resourceId: parsed.data.id, regionId: scope.regionId }, dbSession);
      return true;
    }));
    if (!updated) return Response.json({ message: "Schedule changed. Refresh and try again." }, { status: 409 });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return Response.json({ message: "This schedule already exists" }, { status: 409 });
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Could not save report schedule" }, { status: 503 });
  }
}

export async function POST(request: Request) { return mutate(request, true); }
export async function PATCH(request: Request) { return mutate(request, false); }
