import { z } from "zod";
import { authorizeAPI } from "@/lib/api-auth";
import { readJSON, RequestBodyTooLarge } from "@/lib/request-security";
import { getAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { makeTotpQr } from "@/lib/totp-qr.mjs";

const password = z.string().min(1).max(128);
const code = z.string().regex(/^\d{6}$/);
const input = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("enroll"), password }),
  z.strictObject({ action: z.literal("confirm"), code }),
  z.strictObject({ action: z.enum(["disable", "regenerate"]), password, code }),
]);

export async function POST(request: Request) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const limited = await rateLimit("mfa-management", session.user.id, 20, 300);
    if (limited) return limited;
    const parsed = input.safeParse(await readJSON(request));
    if (!parsed.success) return Response.json({ message: "Invalid security request" }, { status: 400 });
    const data = parsed.data;
    const enabled = "twoFactorEnabled" in session.user && session.user.twoFactorEnabled === true;
    if ((data.action === "enroll" || data.action === "confirm") === enabled) {
      return Response.json({ message: "Authenticator state changed. Refresh Settings." }, { status: 409 });
    }
    const auth = getAuth();
    const headers = request.headers;
    let response: { qr?: string; key?: string | null; codes?: string[]; signInAgain?: boolean } = {};
    if (data.action === "enroll") {
      const enrolled = await auth.api.enableTwoFactor({ headers, body: { method: "totp", password: data.password } });
      if (enrolled.method !== "totp") throw new Error("No enrollment URI");
      response = {
        qr: await makeTotpQr(enrolled.totpURI),
        key: new URL(enrolled.totpURI).searchParams.get("secret"), codes: enrolled.backupCodes,
      };
    } else if (data.action === "confirm") {
      await auth.api.verifyTOTP({ headers, body: { code: data.code } });
      await (await auth.$context).internalAdapter.deleteUserSessions(session.user.id);
      response = { signInAgain: true };
    } else {
      await auth.api.verifyTOTP({ headers, body: { code: data.code } });
      if (data.action === "disable") {
        await auth.api.disableTwoFactor({ headers, body: { password: data.password } });
        await (await auth.$context).internalAdapter.deleteUserSessions(session.user.id);
        response = { signInAgain: true };
      } else {
        const result = await auth.api.generateBackupCodes({ headers, body: { password: data.password } });
        response = { codes: result.backupCodes };
      }
    }
    await audit({ actorId: session.user.id, action: `mfa.${data.action}`, resource: "user", resourceId: session.user.id });
    return Response.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) return error.response();
    return Response.json({ message: "Authenticator update failed. Verify your password and code, then try again." }, { status: 400 });
  }
}
