import { isIP } from "node:net";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getRecoveryMailer } from "@/lib/recovery-mail";
import { isTrustedRequest, readJSON, RequestBodyTooLarge } from "@/lib/request-security";

const requestReset = z.strictObject({ email: z.email().max(254) });
const finishReset = z.strictObject({ token: z.string().regex(/^[a-zA-Z0-9_-]{20,128}$/), newPassword: z.string().min(12).max(128) });

async function handle(request: Request, reset: boolean) {
  if (!isTrustedRequest(request)) return Response.json({ message: "Invalid request origin." }, { status: 403 });
  if (!getRecoveryMailer()) return Response.json({ message: "Password recovery is unavailable." }, { status: 503 });
  try {
    const header = process.env.AUTH_TRUSTED_IP_HEADER;
    const address = header && request.headers.get(header)?.trim();
    if (header && (!address || !isIP(address))) return Response.json({ message: "Client address unavailable." }, { status: 400 });
    const limited = await rateLimit("password-recovery-address", address || "unattributed", 40, 300);
    if (limited) return limited;
    const body = await readJSON(request);
    if (reset) {
      const input = finishReset.safeParse(body);
      if (!input.success) return Response.json({ message: "Provide a valid reset link and a password of at least 12 characters." }, { status: 400 });
      const blocked = await rateLimit("password-recovery-token", input.data.token, 8, 300);
      if (blocked) return blocked;
      try {
        await getAuth().api.resetPassword({ body: input.data });
        return Response.json({ success: true });
      } catch {
        return Response.json({ message: "The reset link is invalid or has expired." }, { status: 400 });
      }
    }
    const input = requestReset.safeParse(body);
    if (!input.success) return Response.json({ message: "Enter a valid email address." }, { status: 400 });
    const email = input.data.email.toLowerCase();
    const blocked = await rateLimit("password-recovery-email", email, 4, 300);
    if (!blocked) {
      try {
        await getAuth().api.requestPasswordReset({ body: { email } });
      } catch {
        console.error("Password recovery request failed");
      }
      await audit({ actorId: null, action: "password.reset.request", resource: "authentication", resourceId: "recovery" });
    }
    return Response.json({ message: "If recovery is available for that account, a reset link will be sent." });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Password recovery is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) { return handle(request, false); }
export async function PATCH(request: Request) { return handle(request, true); }
