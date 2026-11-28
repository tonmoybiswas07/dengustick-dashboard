import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function workerAuthorized(request: Request, secret: string | undefined) {
  if (!secret || secret.length < 32) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}
