import "server-only";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/app/types/auth";

export async function authorizeAPI(permission: Permission) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      session: null,
      error: Response.json(
        { message: "Unauthorized" },
        { status: 401 }
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