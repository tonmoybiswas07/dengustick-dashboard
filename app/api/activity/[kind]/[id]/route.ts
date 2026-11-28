import { ObjectId } from "mongodb";
import { connection } from "next/server";
import { authorizeAPI } from "@/lib/api-auth";
import { auditCollection } from "@/lib/audit";
import { alertsCollection, fieldTasksCollection, usersCollection } from "@/lib/collections";
import { getAlertFilter } from "@/lib/alert-access";
import { rateLimit } from "@/lib/rate-limit";
import { getRegionalScope } from "@/lib/permissions";

export async function GET(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  await connection();
  const { kind, id } = await context.params;
  if (!ObjectId.isValid(id) || (kind !== "task" && kind !== "alert")) {
    return new Response(null, { status: 404 });
  }
  const { session, error } = await authorizeAPI(kind === "task" ? "operations:view" : "alerts:view", request);
  if (error) return error;
  const limited = await rateLimit("record-history", session.user.id, 45);
  if (limited) return limited;

  try {
    const _id = new ObjectId(id);
    const scope = getRegionalScope(session.user, "operations:view");
    const alertScope = getAlertFilter(session.user);
    const record = kind === "task"
      ? scope && await fieldTasksCollection.findOne({
        _id, ...(scope.regionId && { regionId: scope.regionId }),
        ...(scope.ownerId && { assignedTo: scope.ownerId }),
      }, { projection: { _id: 1, regionId: 1 } })
      : alertScope && await alertsCollection.findOne({ ...alertScope, _id }, { projection: { _id: 1, regionId: 1 } });
    if (!record) return new Response(null, { status: 404 });
    const actions = kind === "task" ? ["task.assign", "task.status"] : ["alert.resolve"];
    const events = await auditCollection.find({
      resource: kind, resourceId: _id.toHexString(), regionId: record.regionId, outcome: "success", action: { $in: actions },
    }).project<{ _id: ObjectId; actorId: string | null; action: string; timestamp: Date; metadata?: { status?: string } }>({ actorId: 1, action: 1, timestamp: 1, "metadata.status": 1 }).sort({ timestamp: -1, _id: -1 }).limit(20).maxTimeMS(2500).toArray();
    const actorIds = [...new Set(events.map(({ actorId }) => actorId).filter((value): value is string =>
      typeof value === "string" && ObjectId.isValid(value)))];
    const actors = new Map((await usersCollection.find({ _id: { $in: actorIds.map((value) => new ObjectId(value)) } })
      .project({ name: 1 }).maxTimeMS(2500).toArray()).map(({ _id, name }) => [String(_id), name]));
    return Response.json({ events: events.map(({ _id, actorId, action, timestamp, metadata }) => ({
      id: _id.toHexString(), action, timestamp, actor: actorId ? actors.get(actorId) : undefined, status: metadata?.status,
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ message: "Activity history is unavailable." }, { status: 503 });
  }
}
