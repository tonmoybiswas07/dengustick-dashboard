import { authorizeAPI } from "@/lib/api-auth";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { writeSettings } from "@/lib/settings";
import { personalSettingsPatchSchema } from "@/lib/validations/account";

export async function PATCH(request: Request) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const result = personalSettingsPatchSchema.safeParse(await readJSON(request));
    if (!result.success) return Response.json({ message: "Invalid preferences" }, { status: 400 });
    await writeSettings(`user:${session.user.id}`, result.data);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Unable to save preferences" }, { status: 500 });
  }
}
