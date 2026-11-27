import { MongoServerError } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { writeSettings } from "@/lib/settings";
import { systemSettingsPatchSchema } from "@/lib/validations/account";

export async function PATCH(request: Request) {
  try {
    const { session, error } = await authorizeAPI("settings:manage", request);
    if (error) return error;
    const result = systemSettingsPatchSchema.safeParse(await readJSON(request));
    if (!result.success) return Response.json({ message: "Invalid system settings" }, { status: 400 });
    const writeAndAudit = () => client.withSession((dbSession) => dbSession.withTransaction(async () => {
      await writeSettings("system", result.data, dbSession);
      await audit({
        actorId: session.user.id,
        action: "settings.update",
        resource: "settings",
        resourceId: "system",
        metadata: result.data,
        outcome: "success",
      }, dbSession);
    }));
    try {
      await writeAndAudit();
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
      await writeAndAudit();
    }
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Unable to save system settings" }, { status: 500 });
  }
}
