import "server-only";

import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/app/types/auth";

export async function authorizeAPI(permission: Permission, request?: Request) {
  if (request) {
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || request.url).origin;

    if (
      (origin !== null && origin !== expectedOrigin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return {
        session: null,
        error: Response.json({ message: "Invalid request origin" }, { status: 403 }),
      } as const;
    }
  }

  const session = await getSession();

  if (!session) {
    return {
      session: null,
      error: Response.json(
        { message: "Unauthorized" },
        { status: 401 }
      ),
    } as const;
  }

  if (session.user.banned) {
    return {
      session: null,
      error: Response.json(
        { message: "Account deactivated" },
        { status: 403 }
      ),
    } as const;
  }

  if (!hasPermission(session.user.role, permission)) {
    return {
      session: null,
      error: Response.json(
        { message: "Forbidden" },
        { status: 403 }
      ),
    } as const;
  }

  return {
    session,
    error: null,
  } as const;
}