import { connection } from "next/server";
import { z } from "zod";
import { authorizeAPI } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getInspectionFilter } from "@/lib/inspection-access";
import { getAlertFilter } from "@/lib/alert-access";
import { hasPermission } from "@/lib/permissions";
import { alertsCollection, fieldTasksCollection, inspectionsCollection, reportsCollection, regionsCollection, usersCollection } from "@/lib/collections";

export async function GET(request: Request) {
  await connection();
  try {
    const { session, error } = await authorizeAPI("dashboard:view");
    if (error) return error;
    const user = session.user;
    const limited = await rateLimit("global-search", user.id, 40);
    if (limited) return limited;
    const term = z.string().trim().min(2).max(80).safeParse(new URL(request.url).searchParams.get("q"));
    if (!term.success) return Response.json({ message: "Enter 2 to 80 search characters" }, { status: 400 });
    const regex = { $regex: `^${term.data.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" };
    const inspection = getInspectionFilter(user);
    const alerts = getAlertFilter(user);
    const regional = user.role === "admin" ? {} : { regionId: user.regionId ?? "" };
    const [inspections, notifications, tasks, reports, users, regions] = await Promise.all([
      inspection ? inspectionsCollection.find({ ...inspection, $or: [{ inspectionId: regex }, { "location.area": regex }] })
        .project({ inspectionId: 1, "location.area": 1 }).limit(5).maxTimeMS(1000).toArray() : [],
      alerts ? alertsCollection.find({ ...alerts, title: regex })
        .project({ title: 1 }).limit(5).maxTimeMS(1000).toArray() : [],
      hasPermission(user.role, "operations:view") ? fieldTasksCollection.find({
        ...regional, ...(user.role === "field_worker" && { assignedTo: user.id }), title: regex,
      }).project({ title: 1 }).limit(5).maxTimeMS(1000).toArray() : [],
      hasPermission(user.role, "reports:view") ? reportsCollection.find({
        ...regional, ...(user.role === "researcher" && { generatedBy: user.id }),
        ...(!hasPermission(user.role, "operations:manage") && { type: { $ne: "field_operations" as const } }),
        title: regex,
      }).project({ title: 1 }).limit(5).maxTimeMS(1000).toArray() : [],
      user.role === "admin" ? usersCollection.find({ name: regex }).project({ name: 1 }).limit(5).maxTimeMS(1000).toArray() : [],
      user.role === "admin" ? regionsCollection.find({ name: regex }).project({ name: 1 }).limit(5).maxTimeMS(1000).toArray() : [],
    ]);
    return Response.json({ groups: [
      { label: "Inspections", items: inspections.map((row) => ({ id: String(row._id), title: row.inspectionId, href: `/inspections/${row._id}` })) },
      { label: "Alerts", items: notifications.map((row) => ({ id: String(row._id), title: row.title, href: "/alerts" })) },
      { label: "Tasks", items: tasks.map((row) => ({ id: String(row._id), title: row.title, href: "/field-operations" })) },
      { label: "Reports", items: reports.map((row) => ({ id: String(row._id), title: row.title, href: "/reports" })) },
      { label: "Users", items: users.map((row) => ({ id: String(row._id), title: row.name, href: "/administration" })) },
      { label: "Regions", items: regions.map((row) => ({ id: String(row._id), title: row.name, href: "/administration" })) },
    ].filter((group) => group.items.length) });
  } catch {
    return Response.json({ message: "Search is temporarily unavailable" }, { status: 503 });
  }
}
