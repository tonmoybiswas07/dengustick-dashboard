import { isIP } from "node:net";
import { audit } from "@/lib/audit";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { isTrustedRequest, readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";

const login = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: Request) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (path !== "/api/auth/sign-in/email" && path !== "/api/auth/sign-out") {
    return new Response(null, { status: 404 });
  }

  if (!isTrustedRequest(request)) {
    return Response.json({ message: "Invalid request origin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await readJSON(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    throw error;
  }
  if (path === "/api/auth/sign-out") {
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("content-type");
    return getAuth().handler(new Request(request.url, { method: "POST", headers }));
  }
  const parsed = login.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Invalid credentials" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const ipHeader = process.env.AUTH_TRUSTED_IP_HEADER;
  const ip = ipHeader && request.headers.get(ipHeader)?.trim();
  if (ipHeader) {
    if (!ip || !isIP(ip)) return Response.json({ message: "Client address unavailable" }, { status: 400 });
    const limited = await rateLimit("login-address", ip, 30);
    if (limited) return limited;
  }
  const limited = await rateLimit("login-email", email, 10, 300);
  if (limited) return limited;

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const response = await getAuth().handler(new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...parsed.data, email }),
  }));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Bound anonymous audit volume without throttling authentication for unrelated accounts.
      if (!(await rateLimit("login-failure-audit", "anonymous", 120))) {
        await audit({ actorId: null, action: "login.failure", resource: "authentication", resourceId: "email", outcome: "denied" });
      }
      return Response.json({ message: "Invalid credentials" }, { status: 401 });
    }
    return response;
  }

  const safeHeaders = new Headers({ "Cache-Control": "private, no-store" });
  for (const cookie of response.headers.getSetCookie()) safeHeaders.append("Set-Cookie", cookie);
  return Response.json({ success: true }, { headers: safeHeaders });
}
