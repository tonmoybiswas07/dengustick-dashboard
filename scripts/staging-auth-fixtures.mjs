import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { admin } from "better-auth/plugins";
import { z } from "zod";
import { isDuplicateAccountError, StagingError } from "./staging-auth-errors.mjs";

const credentials = z.object({
  email: z.email().max(254).regex(/@example\.test$/),
  password: z.string().min(12).max(128),
});

export function stagingAuth(config) {
  const plugin = admin({ defaultRole: "admin", adminRoles: ["admin"] });
  return betterAuth({
    database: mongodbAdapter(config.db, { client: config.client }),
    secret: config.secret,
    baseURL: "http://127.0.0.1:3100",
    logger: { disabled: true },
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    disabledPaths: Object.values(plugin.endpoints).map(({ path }) => path),
    plugins: [plugin],
  });
}

export function validateStagingCredentials(input) {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) {
    throw new StagingError("Use an @example.test email and a password between 12 and 128 characters.", "administrator credentials");
  }
  return parsed.data;
}

export async function ensureStagingAdministrator(auth, input, name) {
  const { password, email } = validateStagingCredentials(input);
  const { internalAdapter, password: verifier } = await auth.$context;
  async function matchingUser() {
    const existing = await internalAdapter.findUserByEmail(email);
    if (!existing) return null;
    const user = existing.user;
    const account = await internalAdapter.findCredentialAccount(user.id);
    if (user.name !== name || user.role !== "admin" || user.banned || !account?.password) {
      throw new StagingError("An existing account does not match the staging fixture. No account changes were made.", "duplicate account");
    }
    if (!(await verifier.verify({ hash: account.password, password }))) {
      throw new StagingError("The password does not match the existing staging fixture. No account changes were made.", "administrator credentials");
    }
    return user;
  }

  const existing = await matchingUser();
  if (existing) return { user: existing, created: false };

  try {
    // Server-side provisioning only. Supplying request headers would invoke the HTTP permission policy.
    const { user } = await auth.api.createUser({ body: { email, password, name, role: "admin" } });
    return { user, created: true };
  } catch (error) {
    // The required unique index also protects two concurrent provisioning attempts.
    if (!isDuplicateAccountError(error)) throw error;
    const winner = await matchingUser();
    if (winner) return { user: winner, created: false };
    throw error;
  }
}
