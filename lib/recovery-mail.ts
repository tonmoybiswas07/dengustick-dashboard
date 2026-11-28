import "server-only";

import { z } from "zod";

export interface RecoveryMailer {
  send(to: string, link: string): Promise<void>;
}

export function getRecoveryMailer(): RecoveryMailer | null {
  const key = process.env.RESEND_API_KEY;
  const from = z.email().safeParse(process.env.RECOVERY_EMAIL_FROM);
  const origin = URL.parse(process.env.BETTER_AUTH_URL ?? "");
  if (!key || !from.success || origin?.protocol !== "https:") return null;
  return {
    async send(to, link) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.data, to: [to], subject: "Reset your DengueStick password",
          text: `Open this link to reset your password within 30 minutes:\n${link}\n\nIf you did not request a reset, ignore this email.`,
        }),
      });
      void response.body?.cancel().catch(() => {});
      if (!response.ok) throw new Error("Recovery email delivery failed");
    },
  };
}
