import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import client, { db } from "@/lib/db";
import { admin } from "better-auth/plugins";
import { ac, authRoles } from "@/lib/auth-access";

const adminPlugin = admin({
  ac,
  roles: authRoles,
  defaultRole: "field_worker",
  adminRoles: ["admin"],
});

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

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
