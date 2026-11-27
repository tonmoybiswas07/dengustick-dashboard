import "server-only";

import { hasActiveRegion } from "@/lib/region-security";
import { cache } from "react";
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/app/types/auth";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  if (!requestHeaders.has("cookie")) return null;
  return getAuth().api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
});

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.banned || !(await hasActiveRegion(session.user))) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();

  if (!hasPermission(session.user.role, permission)) {
    redirect("/unauthorized");
  }

  return session;
}