import { getAuth } from "@/lib/auth";
import { authorizeAPI } from "@/lib/api-auth";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { profileSchema } from "@/lib/validations/account";

export async function PATCH(request: Request) {
  try {
    const { error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const result = profileSchema.safeParse(await readJSON(request));
    if (!result.success) {
      return Response.json({ message: result.error.issues[0].message }, { status: 400 });
    }
    await getAuth().api.updateUser({ headers: request.headers, body: result.data });
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Unable to update profile" }, { status: 500 });
  }
}
