import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { audit } from "@/lib/audit";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";
import { authorizeAPI } from "@/lib/api-auth";

export async function GET(request: Request) {
  await connection();

  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const sessions = await getAuth().api.listSessions({ headers: request.headers });
    return Response.json({
      data: sessions.map(({ id, userAgent, createdAt, expiresAt }) => ({
        id, userAgent, createdAt, expiresAt, current: id === session.session.id,
      })),
    });
  } catch {
    return Response.json({ message: "Unable to list sessions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    await readJSON(request);
    await getAuth().api.revokeOtherSessions({ headers: request.headers });
    await audit({ actorId: session.user.id, action: "session.revoke", resource: "user", resourceId: session.user.id });
    return Response.json({ success: true });
  } catch (cause) {
    if (cause instanceof RequestBodyTooLarge) return cause.response();
    return Response.json({ message: "Unable to revoke other sessions" }, { status: 500 });
  }
}
