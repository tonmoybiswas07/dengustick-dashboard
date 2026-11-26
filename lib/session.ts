import "server-only";

import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/app/types/auth";

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
});

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.banned) {
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