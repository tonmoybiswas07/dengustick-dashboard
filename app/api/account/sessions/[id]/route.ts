import { getAuth } from "@/lib/auth";
import { authorizeAPI } from "@/lib/api-auth";
import { audit } from "@/lib/audit";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || id === session.session.id) return new Response(null, { status: 404 });
    const auth = getAuth();
    const selected = (await auth.api.listSessions({ headers: request.headers })).find((candidate) => candidate.id === id);
    if (!selected?.token) return new Response(null, { status: 404 });
    await auth.api.revokeSession({ headers: request.headers, body: { token: selected.token } });
    await audit({ actorId: session.user.id, action: "session.revoke", resource: "user", resourceId: session.user.id });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ message: "Unable to revoke this session" }, { status: 503 });
  }
}
