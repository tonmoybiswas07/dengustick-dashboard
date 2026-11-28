import "server-only";

import { after } from "next/server";
import { audit } from "@/lib/audit";
import { getRecoveryMailer } from "@/lib/recovery-mail";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import client, { db } from "@/lib/db";
import { twoFactor } from "better-auth/plugins/two-factor";
import { admin } from "better-auth/plugins";
import { ac, authRoles } from "@/lib/auth-access";

const authURL = process.env.BETTER_AUTH_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const production = process.env.NODE_ENV === "production";

if (production && (!authURL || !secret || secret.length < 32)) {
  throw new Error("Production requires BETTER_AUTH_URL and a strong BETTER_AUTH_SECRET");
}

if (authURL) {
  const url = new URL(authURL);
  if (url.origin !== authURL.replace(/\/$/, "") || (production && url.protocol !== "https:")) {
    throw new Error("BETTER_AUTH_URL must be the application origin and use HTTPS in production");
  }
}

function createAuth() {
  const adminPlugin = admin({
    ac,
    roles: authRoles,
    defaultRole: "field_worker",
    adminRoles: ["admin"],
  });

  const mailer = getRecoveryMailer();
  return betterAuth({
    database: mongodbAdapter(db, {
      client,
    }),

    secret,
    onAPIError: { onError: () => console.error("Authentication request could not be completed") },

    baseURL: authURL,
    trustedOrigins: authURL ? [new URL(authURL).origin] : [],
    advanced: {
      useSecureCookies: production || authURL?.startsWith("https://"),
    },
    session: {
      cookieCache: { enabled: false },
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    // The public login wrapper applies shared MongoDB rate limits.
    rateLimit: { enabled: false },

    // Dashboard administration calls the plugin directly after applying its account safeguards.
    disabledPaths: Object.values(adminPlugin.endpoints).map((endpoint) => endpoint.path),

    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      ...(mailer && authURL && {
        async sendResetPassword({ user, token }) {
          if ("banned" in user && user.banned) return;
          const link = new URL("/reset-password", authURL);
          link.hash = new URLSearchParams({ token }).toString();
          after(async () => {
            try {
              await mailer.send(user.email, link.href);
            } catch {
              console.error("Recovery email delivery failed");
            }
          });
        },
        async onPasswordReset({ user }) {
          await audit({ actorId: user.id, action: "password.reset", resource: "user", resourceId: user.id });
        },
      }),
    },

    verification: { storeIdentifier: { default: "plain", overrides: { "reset-password:": "hashed" } } },

    user: {
      additionalFields: {
        regionId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },

    plugins: [adminPlugin, twoFactor({ issuer: "DengueStick", skipVerificationOnEnable: false, backupCodeOptions: { storeBackupCodes: "encrypted" } }), nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return auth ??= createAuth();
}
