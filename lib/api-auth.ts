import "server-only";

import { audit } from "@/lib/audit";
import { hasActiveRegion } from "@/lib/region-security";
import { isTrustedRequest } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/app/types/auth";

const mutationLimits: Partial<Record<Permission, number>> = {
  "users:manage": 15,
  "settings:manage": 10,
  "reports:create": 5,
  "alerts:manage": 5,
};

const readLimits: Partial<Record<Permission, number>> = {
  "analytics:view": 30,
  "models:evaluate": 30,
  "map:view": 30,
  "dashboard:view": 60,
  "operations:manage": 120,
  "users:manage": 120,
  "ai:review": 60,
  "reports:view": 60,
  "inspections:view": 120,
};

export async function authorizeAPI(permission: Permission, request?: Request) {
  if (request && !isTrustedRequest(request)) {
    return {
      session: null,
      error: Response.json({ message: "Invalid request origin" }, { status: 403 }),
    } as const;
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

  if (!hasPermission(session.user.role, permission) || !(await hasActiveRegion(session.user))) {
    if (request && !["GET", "HEAD"].includes(request.method)) {
      const limited = await rateLimit("authorization-audit", session.user.id, 10);
      if (!limited) await audit({ actorId: session.user.id, action: "authorization.denied", resource: "permission", resourceId: permission, outcome: "denied" });
    }
    return {
      session: null,
      error: Response.json(
        { message: "Forbidden" },
        { status: 403 }
      ),
    } as const;
  }

  const read = request && ["GET", "HEAD"].includes(request.method);
  const limit = read ? readLimits[permission] : mutationLimits[permission] ?? 30;
  if (request && limit) {
    const error = await rateLimit(`${permission}:${read ? "read" : "write"}`, session.user.id, limit);
    if (error) return { session: null, error } as const;
  }

  return {
    session,
    error: null,
  } as const;
}