import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { MongoClient, MongoServerError, ObjectId } from "mongodb";

let collection;
globalThis.securityTestDb = { collection: (...args) => collection(...args) };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only" || specifier === "@/lib/db") {
      const source = specifier === "server-only" ? "" : "export const db = globalThis.securityTestDb";
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return next(specifier, context);
  },
});

const settingsWrites = [];
let insertedAudit;
let failAudit = false;
let rateResult;
let rateCalls = [];
let duplicate = false;
collection = (name) => ({
  async insertOne(record, options) {
    if (failAudit) throw new Error("storage failure");
    insertedAudit = { record, options };
  },
  async updateOne(filter, update, options) {
    settingsWrites.push({ name, filter, update, options });
    return { matchedCount: 1 };
  },
  async findOneAndUpdate(filter, update, options) {
    rateCalls.push({ name, filter, update, options });
    if (duplicate) {
      duplicate = false;
      throw new MongoServerError({ code: 11000, message: "duplicate" });
    }
    if (rateResult instanceof Error) throw rateResult;
    return rateResult;
  },
});

const { audit } = await import("../lib/audit.ts");
const { rateLimit } = await import("../lib/rate-limit.ts");
const { writeSettings } = await import("../lib/settings.ts");
const { personalSettingsPatchSchema } = await import("../lib/validations/account.ts");

test("transactional audit records use the same session and reject injected metadata", async () => {
  const session = {};
  const event = { actorId: null, action: "login.failure", resource: "authentication", resourceId: "email", outcome: "denied" };
  await audit(event, session);
  assert.equal(insertedAudit.options.session, session);
  assert.deepEqual({ ...insertedAudit.record, timestamp: undefined }, { ...event, timestamp: undefined });
  await assert.rejects(audit({ ...event, action: "login.failure\nforged" }, session));
  await assert.rejects(audit({ ...event, metadata: { password: "sensitive" } }, session));
  failAudit = true;
  await assert.rejects(audit(event, session), /storage failure/);
  failAudit = false;
});

test("independent settings patches use non-overlapping MongoDB paths", async () => {
  await Promise.all([
    writeSettings("user:test", personalSettingsPatchSchema.parse({ theme: "dark" })),
    writeSettings("user:test", personalSettingsPatchSchema.parse({ alertNotifications: false })),
  ]);
  assert.deepEqual(settingsWrites.map((call) => call.update), [
    { $set: { "value.theme": "dark" } },
    { $set: { "value.alertNotifications": false } },
  ]);
  assert.equal(personalSettingsPatchSchema.safeParse({ "value.theme": "dark" }).success, false);
  assert.equal(personalSettingsPatchSchema.safeParse({}).success, false);
});

test("rate limiting hashes subjects, returns retry times, and retries concurrent inserts", async () => {
  rateResult = { allowed: false, retryMs: 1201 };
  duplicate = true;
  const limited = await rateLimit("login-email", "person@example.test", 10, 300);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "2");
  assert.equal(rateCalls.length, 2);
  assert.match(rateCalls[0].filter._id, /^[a-f0-9]{64}$/);
  assert.equal(rateCalls[0].filter._id, rateCalls[1].filter._id);
  assert.equal(rateCalls[1].options.upsert, undefined);
  assert.ok(JSON.stringify(rateCalls[0].update).includes("$$NOW"));
  assert.ok(JSON.stringify(rateCalls[0].update).includes("expiresAt"));
  rateResult = { allowed: true, retryMs: 0 };
  assert.equal(await rateLimit("login-email", "different@example.test", 10, 300), null);
  assert.notEqual(rateCalls[0].filter._id, rateCalls[2].filter._id);
  rateResult = new Error("unavailable");
  assert.equal((await rateLimit("login-email", "person@example.test", 10, 300)).status, 503);
});

const uri = process.env.MONGODB_TEST_URI;
test("local replica set serializes conflicting region lifecycle writes", { skip: !uri }, async () => {
  const endpoint = /^mongodb:\/\/(?:localhost|127\.0\.0\.1):\d+\/(?:\?.*)?$/.test(uri);
  assert.ok(endpoint, "Use a dedicated local MongoDB replica set URI with one loopback host");
  const client = new MongoClient(uri, { directConnection: true, serverSelectionTimeoutMS: 3000 });
  const db = client.db(`dengue_test_${new ObjectId()}`);
  const regions = db.collection("regions");
  const users = db.collection("user");
  const tasks = db.collection("field_tasks");
  collection = (name) => db.collection(name);
  const { lockRegion } = await import("../lib/region-security.ts");
  const { audit: persistAudit } = await import("../lib/audit.ts?integration");
  const { writeSettings: persistSettings } = await import("../lib/settings.ts?integration");
  try {
    await db.collection("request_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const responses = await Promise.all(Array.from({ length: 5 }, () => rateLimit("test", "test", 8, 60)));
    assert.equal(responses.filter((response) => response === null).length, 2);
    assert.equal(responses.filter((response) => response?.status === 429).length, 3);
    await Promise.all([
      persistSettings("user:concurrent", { theme: "dark" }),
      persistSettings("user:concurrent", { alertNotifications: false }),
    ]);
    assert.deepEqual((await db.collection("settings").findOne({ _id: "user:concurrent" })).value, {
      theme: "dark", alertNotifications: false,
    });
    const reports = db.collection("reports");
    const recordId = new ObjectId();
    await assert.rejects(client.withSession((session) => session.withTransaction(async () => {
      await reports.insertOne({ _id: recordId }, { session });
      await persistAudit({ actorId: null, action: "invalid\ninjection", resource: "report", resourceId: recordId.toHexString() }, session);
    })));
    assert.equal(await reports.findOne({ _id: recordId }), null);
    await client.withSession((session) => session.withTransaction(async () => {
      await reports.insertOne({ _id: recordId }, { session });
      await persistAudit({
        actorId: new ObjectId().toHexString(), action: "report.generate",
        resource: "report", resourceId: recordId.toHexString(),
      }, session);
    }));
    assert.ok(await reports.findOne({ _id: recordId }));
    assert.ok(await db.collection("audit_logs").findOne({ resourceId: recordId.toHexString() }));
    for (const kind of ["assignment", "reactivation", "task"]) {
      const id = new ObjectId();
      const regionId = id.toHexString();
      const userId = new ObjectId();
      await regions.insertOne({ _id: id, isActive: true });
      if (kind === "reactivation") await users.insertOne({ _id: userId, regionId, banned: true });
      const deactivate = () => client.withSession((session) => session.withTransaction(async () => {
        assert.equal(await lockRegion(session, regionId, false), true);
        if (await users.findOne({ regionId, banned: { $ne: true } }, { session })) return false;
        if (await tasks.findOne({ regionId }, { session })) return false;
        await regions.updateOne({ _id: id }, { $set: { isActive: false } }, { session });
        return true;
      }));
      const assign = () => client.withSession((session) => session.withTransaction(async () => {
        if (!(await lockRegion(session, regionId))) return false;
        if (kind === "task") await tasks.insertOne({ regionId }, { session });
        else if (kind === "reactivation") await users.updateOne({ _id: userId }, { $set: { banned: false } }, { session });
        else await users.insertOne({ _id: userId, regionId, banned: false }, { session });
        return true;
      }));
      const outcomes = await Promise.all([deactivate(), assign()]);
      assert.equal(outcomes.filter(Boolean).length, 1, kind);
    }
  } finally {
    await client.close();
  }
});
