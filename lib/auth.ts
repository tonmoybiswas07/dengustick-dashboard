import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import client, { db } from "@/lib/db";
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

  return betterAuth({
    database: mongodbAdapter(db, {
      client,
    }),

    secret,

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
    },

    user: {
      additionalFields: {
        regionId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },

    plugins: [adminPlugin, nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return auth ??= createAuth();
}
