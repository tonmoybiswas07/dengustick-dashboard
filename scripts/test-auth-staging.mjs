import { fork } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { ObjectId } from "mongodb";
import { reportStagingError, stagingConfig, StagingError, verifyStagingDatabase } from "./staging-auth-config.mjs";
import { ensureStagingAdministrator, stagingAuth } from "./staging-auth-fixtures.mjs";

function expect(condition, message) {
  if (!condition) throw new StagingError(message);
}

function browser(origin, initialCookies = new Map()) {
  const cookies = new Map(initialCookies);
  return {
    cookies,
    async fetch(path, { method = "GET", body } = {}) {
      const headers = new Headers({ Origin: origin });
      if (cookies.size) headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
      if (body !== undefined) headers.set("Content-Type", "application/json");
      const response = await fetch(new URL(path, origin), {
        method, headers, redirect: "manual", signal: AbortSignal.timeout(90_000),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const line of response.headers.getSetCookie()) {
        const pair = line.split(";")[0];
        const equals = pair.indexOf("=");
        const key = pair.slice(0, equals);
        const value = pair.slice(equals + 1);
        if (!value || /;\s*max-age=0(?:;|$)/i.test(line)) cookies.delete(key);
        else cookies.set(key, value);
      }
      return response;
    },
  };
}

const password = () => randomBytes(24).toString("base64url");
const login = (agent, email, value) => agent.fetch("/api/auth/sign-in/email", {
  method: "POST", body: { email, password: value },
});
const patchProfile = (agent, name, fields = {}) => agent.fetch("/api/account", {
  method: "PATCH", body: { name, image: null, ...fields },
});
const changePassword = (agent, current, next) => agent.fetch("/api/account/password", {
  method: "POST", body: { currentPassword: current, newPassword: next, confirmation: next },
});
const sessionValue = ({ cookies }) => [...cookies].find(([name]) => name.endsWith(".session_token"))?.[1];

let config;
let child;
const disposableUsers = [];
let phase = "staging configuration";
try {
  config = stagingConfig();
  await verifyStagingDatabase(config);

  phase = "staging app startup";
  // The app binds its own ephemeral loopback port and reports it over private IPC.
  child = fork(new URL("./serve-staging-auth.mjs", import.meta.url), ["--allow-staging-writes"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    env: {
      ...process.env,
      STAGING_MONGODB_URI: config.uri,
      STAGING_BETTER_AUTH_SECRET: config.secret,
      STAGING_MONGODB_DB: config.db.databaseName,
      STAGING_AUTH_ADMIN_EMAIL: "",
      STAGING_AUTH_ADMIN_PASSWORD: "",
    },
  });
  const [ready] = await Promise.race([
    once(child, "message", { signal: AbortSignal.timeout(90_000) }),
    once(child, "exit").then(() => { throw new StagingError("The loopback staging app exited before it became ready."); }),
  ]);
  expect(typeof ready?.origin === "string" && /^http:\/\/127\.0\.0\.1:\d+$/.test(ready.origin), "Invalid staging app origin.");
  const origin = ready.origin;

  phase = "fixture provisioning";
  const run = randomUUID();
  const email = `auth-suite-${run}@example.test`;
  const bannedEmail = `auth-banned-${run}@example.test`;
  const initialPassword = password();
  const nextPassword = password();
  const bannedPassword = password();
  const initialName = `Auth Suite ${run}`;
  const updatedName = `Updated Auth Suite ${run}`;
  const auth = stagingAuth(config);
  async function createDisposableFixture(email, password, name) {
    const { user, created } = await ensureStagingAdministrator(auth, { email, password }, name);
    expect(created, "The generated fixture email was already in use.");
    disposableUsers.push({ _id: new ObjectId(user.id), email });
    return user;
  }
  const user = await createDisposableFixture(email, initialPassword, initialName);
  const bannedUser = await createDisposableFixture(bannedEmail, bannedPassword, `Banned Auth Suite ${run}`);

  const primary = browser(origin);
  const secondary = browser(origin);
  const anonymous = browser(origin);
  const bannedBrowser = browser(origin);
  const users = config.db.collection("user");
  const userId = new ObjectId(user.id);
  async function check(name, runCheck) {
    phase = name;
    await runCheck();
    console.log(`PASS ${name}`);
  }

  await check("Unauthenticated protected route access", async () => {
    expect((await anonymous.fetch("/api/account/sessions")).status === 401, "Anonymous session endpoint did not return 401.");
  });
  await check("Successful login", async () => {
    const response = await login(primary, email, initialPassword);
    expect(response.status === 200 && Boolean(sessionValue(primary)), "Login did not establish a session.");
    const payload = await response.json();
    expect(payload.success === true && !("token" in payload), "Login response did not have its expected public shape.");
  });
  await check("Invalid password rejection", async () => {
    const response = await login(anonymous, email, password());
    expect(response.status === 401 && !sessionValue(anonymous), "Invalid login did not fail without issuing a session.");
  });
  await check("Profile information retrieval", async () => {
    const response = await primary.fetch("/profile");
    const html = await response.text();
    expect(response.ok && html.includes(initialName) && html.includes(email), "Profile did not render the fixture information.");
  });
  await check("Profile name update", async () => {
    expect((await patchProfile(primary, updatedName)).status === 200, "Profile update failed.");
    const response = await primary.fetch("/profile");
    expect(response.ok && (await response.text()).includes(updatedName), "The updated name was not rendered.");
    expect((await users.findOne({ _id: userId }))?.name === updatedName, "The updated name was not persisted.");
  });
  await check("Unauthorized profile fields", async () => {
    const response = await patchProfile(primary, updatedName, {
      role: "researcher", banned: true, emailVerified: true, regionId: new ObjectId().toHexString(),
    });
    const saved = await users.findOne({ _id: userId });
    expect(response.status === 400 && saved?.role === "admin" && !saved.banned &&
      !saved.emailVerified && !saved.regionId, "An unauthorized profile update was not rejected.");
  });
  await check("Incorrect current password rejection", async () => {
    const response = await changePassword(primary, password(), nextPassword);
    expect(response.status === 400 && (await response.json()).message === "Current password could not be verified",
      "The password endpoint did not reject the incorrect current password.");
  });

  phase = "second session setup";
  expect((await login(secondary, email, initialPassword)).status === 200 &&
    (await secondary.fetch("/api/account/sessions")).status === 200, "Could not establish an independent second session.");
  const previousCookies = new Map(primary.cookies);
  const originalToken = sessionValue(primary);
  await check("Successful password change", async () => {
    expect((await changePassword(primary, initialPassword, nextPassword)).status === 200, "Password update failed.");
    const { internalAdapter, password: verifier } = await auth.$context;
    const account = await internalAdapter.findCredentialAccount(user.id);
    expect(account?.password &&
      await verifier.verify({ hash: account.password, password: nextPassword }) &&
      !(await verifier.verify({ hash: account.password, password: initialPassword })), "The new credential was not persisted.");
  });
  await check("Session rotation", async () => {
    const freshToken = sessionValue(primary);
    expect(Boolean(freshToken) && freshToken !== originalToken, "The session cookie did not rotate.");
    expect((await primary.fetch("/api/account/sessions")).status === 200, "The rotated session was rejected.");
    expect((await browser(origin, previousCookies).fetch("/api/account/sessions")).status === 401, "The old session was still valid.");
  });
  await check("Other session revocation", async () => {
    expect((await secondary.fetch("/api/account/sessions")).status === 401, "The other session was not revoked.");
    const otherBanFixtureSession = browser(origin);
    expect((await login(bannedBrowser, bannedEmail, bannedPassword)).status === 200 &&
      (await login(otherBanFixtureSession, bannedEmail, bannedPassword)).status === 200,
    "Could not establish sessions for the explicit revocation check.");
    expect((await bannedBrowser.fetch("/api/account/sessions", { method: "POST" })).status === 200,
      "The sign-out-other-sessions endpoint failed.");
    expect((await bannedBrowser.fetch("/api/account/sessions")).status === 200 &&
      (await otherBanFixtureSession.fetch("/api/account/sessions")).status === 401,
    "Explicit revocation did not preserve only the current session.");
  });
  const beforeLogout = new Map(primary.cookies);
  await check("Logout", async () => {
    expect((await primary.fetch("/api/auth/sign-out", { method: "POST" })).status === 200 &&
      !sessionValue(primary), "Logout did not clear the session.");
  });
  await check("Protected route access after logout", async () => {
    expect((await primary.fetch("/api/account/sessions")).status === 401, "Logged-out client retained access.");
    expect((await browser(origin, beforeLogout).fetch("/api/account/sessions")).status === 401, "Logout did not invalidate the server session.");
  });
  await check("Banned account access rejection", async () => {
    // Mark only the new fixture, without revoking its cookie, to exercise the live ban guard.
    const result = await users.updateOne({
      _id: new ObjectId(bannedUser.id), email: bannedEmail, role: "admin",
    }, { $set: { banned: true } });
    expect(result.modifiedCount === 1, "Could not mark the dedicated fixture as banned.");
    const existing = await bannedBrowser.fetch("/api/account/sessions");
    expect(existing.status === 403 || existing.status === 401, "The banned session retained access.");
    expect((await login(browser(origin), bannedEmail, bannedPassword)).status === 401, "The banned account could still sign in.");
  });
  console.log("All 13 staging authentication checks passed.");
} catch (error) {
  reportStagingError(error, `Staging authentication check failed during ${phase}.`);
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill();
    const forceStop = setTimeout(() => child.kill("SIGKILL"), 5000);
    try {
      await exited;
    } finally {
      clearTimeout(forceStop);
    }
  }
  try {
    if (disposableUsers.length) {
      const result = await config.db.collection("user").updateMany(
        { role: "admin", $or: disposableUsers }, { $set: { banned: true } },
      );
      expect(result.matchedCount === disposableUsers.length, "One or more suite accounts could not be disabled.");
      console.log("Disposable staging accounts were disabled and their records retained.");
    }
  } catch {
    reportStagingError(null, "Dispose of the suite accounts through approved staging maintenance. Automatic disablement could not be confirmed.");
  } finally {
    await config?.client.close();
  }
}
