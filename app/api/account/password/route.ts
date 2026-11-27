import { APIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import { authorizeAPI } from "@/lib/api-auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { passwordSchema } from "@/lib/validations/account";

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const limited = await rateLimit("password", session.user.id, 5, 300);
    if (limited) return limited;
    const result = passwordSchema.safeParse(await readJSON(request));
    if (!result.success) {
      return Response.json({ message: result.error.issues[0].message }, { status: 400 });
    }

    try {
      const { headers } = await getAuth().api.changePassword({
        headers: request.headers,
        returnHeaders: true,
        body: {
          currentPassword: result.data.currentPassword,
          newPassword: result.data.newPassword,
          revokeOtherSessions: true,
        },
      });
      await audit({ actorId: session.user.id, action: "password.change", resource: "user", resourceId: session.user.id });
      const responseHeaders = new Headers();
      for (const cookie of headers.getSetCookie()) responseHeaders.append("Set-Cookie", cookie);
      return Response.json({ success: true }, { headers: responseHeaders });
    } catch (cause) {
      if (cause instanceof APIError && cause.status === "BAD_REQUEST") {
        await audit({ actorId: session.user.id, action: "password.change", resource: "user", resourceId: session.user.id, outcome: "denied" });
        return Response.json({ message: "Current password could not be verified" }, { status: 400 });
      }
      throw cause;
    }
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Unable to change password" }, { status: 500 });
  }
}
