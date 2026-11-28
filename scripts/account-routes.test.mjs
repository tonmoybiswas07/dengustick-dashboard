import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const mocked = new Map(
  Object.entries({
    "server-only": "",
    "@/lib/recovery-mail": "export const getRecoveryMailer = () => globalThis.accountRecoveryConfigured ? {} : null",
    "@/lib/auth": "export const getAuth = () => globalThis.accountTestAuth",
    "@/lib/session":
      "export const getSession = () => globalThis.accountTestSession",
    "@/lib/rate-limit": "export const rateLimit = async () => null",
    "@/lib/audit":
      "export const audit = async (event) => globalThis.accountAudit.push(event); export const auditCollection = {}",
    "@/lib/db": "export default {}; export const db = {}",
    "@/lib/collections":
      "export const usersCollection = { findOne: async () => globalThis.accountTestTarget }; export const fieldTasksCollection = {}; export const regionsCollection = { findOne: async ({ _id, isActive }) => isActive && _id.toHexString() === globalThis.accountActiveRegion ? { _id } : null }",
  }),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocked.has(specifier)) {
      return {
        url: `data:text/javascript,${encodeURIComponent(mocked.get(specifier))}`,
        shortCircuit: true,
      };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});

globalThis.accountActiveRegion = "0123456789abcdef01234567";
let updateBody;
let passwordBody;
let authCalls = 0;
let loginStatus = 200;
let challengeSession = null;
let authPayload;
let recoveryEmail;
let resetPayload;
globalThis.accountAudit = [];
globalThis.accountTestAuth = {
  async handler() {
    authCalls += 1;
    if (loginStatus !== 200) return Response.json({ code: "BANNED_USER", token: "private" }, { status: loginStatus });
    return Response.json(
      authPayload ?? { token: "internal", user: { id: "test" } },
      {
        headers: { "Set-Cookie": "test-session=mock; HttpOnly; Secure" },
      },
    );
  },
  api: {
    async getSession() { return challengeSession; },
    async requestPasswordReset({ body }) {
      recoveryEmail = body.email;
      throw new Error("mock provider error");
    },
    async resetPassword({ body }) { resetPayload = body; },
    async updateUser({ body }) {
      updateBody = body;
    },
    async changePassword({ body }) {
      passwordBody = body;
      return {
        headers: new Headers({
          "Set-Cookie": "test-session=rotated; HttpOnly; Secure",
        }),
      };
    },
  },
};

const { POST: authPost } = await import("../app/api/auth/[...all]/route.ts");
const { POST: requestRecovery, PATCH: resetRecovery } = await import("../app/api/account/recovery/route.ts");
const { PATCH: updateProfile } = await import("../app/api/account/route.ts");
const { POST: updatePassword } =
  await import("../app/api/account/password/route.ts");

const { PATCH: updateAdminUser } =
  await import("../app/api/administration/users/[id]/route.ts");

function request(
  path,
  body,
  method = "POST",
  origin = "https://dashboard.test",
) {
  return new Request(`https://dashboard.test${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

test("native administration, registration and account mutation paths never reach Better Auth", async () => {
  const countBefore = authCalls;
  for (const path of [
    "admin/create-user",
    "admin/ban-user",
    "admin/set-role",
    "sign-up/email",
    "update-user",
    "change-password",
    "request-password-reset",
    "reset-password",
    "two-factor/enable",
    "two-factor/disable",
    "two-factor/generate-backup-codes",
  ]) {
    assert.equal(
      (await authPost(request(`/api/auth/${path}`, {}))).status,
      404,
    );
  }
  assert.equal(authCalls, countBefore);
});

test("login retains the session cookie and filters the adapter response", async () => {
  const login = await authPost(
    request("/api/auth/sign-in/email", {
      email: "user@example.test",
      password: "mock-password",
    }),
  );
  assert.equal(login.status, 200);
  assert.deepEqual(await login.json(), { success: true });
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
});

test("profile endpoint rejects missing sessions, banned accounts and foreign origins", async () => {
  const details = { name: "Test User", image: null };
  globalThis.accountTestSession = null;
  assert.equal(
    (await updateProfile(request("/api/account", details, "PATCH"))).status,
    401,
  );
  globalThis.accountTestSession = {
    user: { id: "user", role: "field_worker", banned: true },
  };
  assert.equal(
    (await updateProfile(request("/api/account", details, "PATCH"))).status,
    403,
  );
  globalThis.accountTestSession.user.banned = false;
  assert.equal(
    (
      await updateProfile(
        request("/api/account", details, "PATCH", "https://other.test"),
      )
    ).status,
    403,
  );
});

test("profile only passes permitted fields to the current-user API", async () => {
  globalThis.accountTestSession = {
    user: { id: "user", role: "field_worker", regionId: globalThis.accountActiveRegion },
  };
  const details = { name: "Test User", image: null };
  assert.equal(
    (
      await updateProfile(
        request("/api/account", { ...details, role: "admin" }, "PATCH"),
      )
    ).status,
    400,
  );
  assert.equal(
    (await updateProfile(request("/api/account", details, "PATCH"))).status,
    200,
  );
  assert.deepEqual(updateBody, details);
});

test("password route verifies confirmation and requests Better Auth session rotation", async () => {
  globalThis.accountTestSession = {
    user: { id: "user", role: "field_worker", regionId: globalThis.accountActiveRegion },
  };
  const payload = {
    currentPassword: "mock-old-password",
    newPassword: "mock-new-password",
  };
  assert.equal(
    (
      await updatePassword(
        request("/api/account/password", {
          ...payload,
          confirmation: "mismatch",
        }),
      )
    ).status,
    400,
  );
  const response = await updatePassword(
    request("/api/account/password", {
      ...payload,
      confirmation: payload.newPassword,
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.match(response.headers.get("set-cookie"), /rotated/);
  assert.deepEqual(passwordBody, { ...payload, revokeOtherSessions: true });
});

test("administration handler rejects ordinary users and protects administrator accounts", async () => {
  const id = "0123456789abcdef01234567";
  const path = `/api/administration/users/${id}`;
  const context = { params: Promise.resolve({ id }) };
  globalThis.accountTestSession = {
    user: { id: "worker", role: "field_worker" },
  };
  assert.equal(
    (await updateAdminUser(request(path, {}, "PATCH"), context)).status,
    403,
  );
  globalThis.accountTestSession = {
    user: { id: "another-admin", role: "admin" },
  };
  globalThis.accountTestTarget = { role: "admin", banned: false };
  assert.equal(
    (await updateAdminUser(request(path, { banned: true }, "PATCH"), context))
      .status,
    403,
  );
  globalThis.accountTestSession.user.id = id;
  assert.equal(
    (await updateAdminUser(request(path, {}, "PATCH"), context)).status,
    403,
  );
});


test("authenticated oversized bodies produce 413 for declared and streamed payloads", async () => {
  globalThis.accountTestSession = { user: { id: "user", role: "field_worker", regionId: globalThis.accountActiveRegion } };
  const streamed = request("/api/account", { name: "x".repeat(65536) }, "PATCH");
  assert.equal((await updateProfile(streamed)).status, 413);
  const declared = new Request("https://dashboard.test/api/auth/sign-in/email", {
    method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "65537" },
  });
  assert.equal((await authPost(declared)).status, 413);
});

test("active-region authorization fails closed for every non-admin role", async () => {
  const details = { name: "Test User", image: null };
  for (const role of ["health_authority", "supervisor", "field_worker", "researcher"]) {
    for (const regionId of [undefined, "invalid", "000000000000000000000000"]) {
      globalThis.accountTestSession = { user: { id: "user", role, regionId } };
      assert.equal((await updateProfile(request("/api/account", details, "PATCH"))).status, 403, role);
    }
    globalThis.accountTestSession.user.regionId = globalThis.accountActiveRegion;
    assert.equal((await updateProfile(request("/api/account", details, "PATCH"))).status, 200, role);
  }
  globalThis.accountTestSession = { user: { id: "admin", role: "admin" } };
  assert.equal((await updateProfile(request("/api/account", details, "PATCH"))).status, 200);
});

test("login failures are generic and audit captures no credentials or submitted identity", async () => {
  loginStatus = 403;
  try {
    const response = await authPost(request("/api/auth/sign-in/email", { email: "private@example.test", password: "private-password" }));
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "Invalid credentials" });
    assert.deepEqual(globalThis.accountAudit.at(-1), {
      actorId: null, action: "login.failure", resource: "authentication", resourceId: "email", outcome: "denied",
    });
  } finally {
    loginStatus = 200;
  }
});

test("regional scopes prevent cross-region inspection access and preserve worker ownership", async () => {
  const { getInspectionFilter } = await import("../lib/inspection-access.ts");
  const { getAlertFilter } = await import("../lib/alert-access.ts");
  const regionId = globalThis.accountActiveRegion;
  const worker = { id: "owner", role: "field_worker", regionId };
  assert.deepEqual(getInspectionFilter(worker), { regionId, inspectorId: "owner" });
  assert.deepEqual(getAlertFilter(worker), { regionId, assignedTo: "owner" });
  for (const role of ["supervisor", "health_authority"]) {
    assert.deepEqual(getInspectionFilter({ id: "user", role, regionId }), { regionId });
  }
  assert.equal(getInspectionFilter({ id: "user", role: "researcher", regionId }), null);
  assert.deepEqual(getInspectionFilter({ id: "admin", role: "admin" }), {});
});

test("MFA login preserves only the challenge flag and cookies", async () => {
  authPayload = { twoFactorRedirect: true, token: "private" };
  try {
    const response = await authPost(request("/api/auth/sign-in/email", { email: "mfa@example.test", password: "mock-password" }));
    assert.deepEqual(await response.json(), { twoFactorRedirect: true });
    assert.equal(response.headers.getSetCookie().length, 1);
  } finally {
    authPayload = undefined;
  }
});

test("MFA challenge rejects management attempts and strips the session payload", async () => {
  const path = "/api/auth/two-factor/verify-totp";
  const before = authCalls;
  challengeSession = { user: { id: "test" } };
  try {
    assert.equal((await authPost(request(path, { code: "123456" }))).status, 409);
    assert.equal(authCalls, before);
  } finally {
    challengeSession = null;
  }
  assert.equal((await authPost(request(path, { code: "123456", trustDevice: true }))).status, 400);
  const challenge = await authPost(request(path, { code: "123456" }));
  assert.deepEqual(await challenge.json(), { success: true });
  assert.equal(challenge.headers.getSetCookie().length, 1);
});

test("recovery is disabled by default and hides account/provider outcomes", async () => {
  const path = "/api/account/recovery";
  const body = { email: "USER@example.test" };
  assert.equal((await requestRecovery(request(path, body))).status, 503);
  globalThis.accountRecoveryConfigured = true;
  try {
    const response = await requestRecovery(request(path, body));
    assert.equal(response.status, 200);
    assert.equal(recoveryEmail, "user@example.test");
    assert.doesNotMatch(JSON.stringify(await response.json()), /example|provider/);
    const token = "mock-token-with-at-least-20-chars";
    assert.equal((await resetRecovery(request(path, { token, newPassword: "too-short" }, "PATCH"))).status, 400);
    assert.equal((await resetRecovery(request(path, { token, newPassword: "mock-new-password" }, "PATCH"))).status, 200);
    assert.deepEqual(resetPayload, { token, newPassword: "mock-new-password" });
  } finally {
    globalThis.accountRecoveryConfigured = false;
  }
});
