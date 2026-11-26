import "server-only";

import { authorizeAPI } from "@/lib/api-auth";

export async function authorizeAdmin() {
  const { session, error } = await authorizeAPI(
    "users:manage"
  );

  if (error) {
    return {
      session: null,
      error,
    } as const;
  }

  if (
    session.user.role !== "admin" ||
    session.user.banned
  ) {
    return {
      session: null,

      error: Response.json(
        { message: "Administrator access required" },
        { status: 403 }
      ),
    } as const;
  }

  return {
    session,
    error: null,
  } as const;
}