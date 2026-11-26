import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import client, { db } from "@/lib/db";

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  emailAndPassword: {
  enabled: true,
  disableSignUp: false,
  minPasswordLength: 8,
},

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "field_worker",
        input: false,
      },

      regionId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  plugins: [nextCookies()],
});