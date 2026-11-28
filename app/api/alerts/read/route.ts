import { z } from "zod";
import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { getAlertFilter } from "@/lib/alert-access";
import { alertsCollection } from "@/lib/collections";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI("alerts:view", request);
    if (error) return error;
    const filter = getAlertFilter(session.user);
    if (!filter) return new Response(null, { status: 403 });
    const parsed = z.strictObject({ ids: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(10) }).safeParse(await readJSON(request));
    if (!parsed.success) return Response.json({ message: "Invalid alert selection" }, { status: 400 });
    await alertsCollection.updateMany({ ...filter, _id: { $in: parsed.data.ids.map((id) => new ObjectId(id)) } },
      { $addToSet: { readBy: session.user.id } });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Could not mark alerts as read" }, { status: 503 });
  }
}
