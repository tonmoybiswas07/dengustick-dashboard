import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { MongoServerError, ObjectId } from "mongodb";

const regionId = "0123456789abcdef01234567";
const worker = { id: "worker", role: "field_worker", regionId };
let user = worker;
let active = true;
let records = [];
let districtError;
let countError;
let recordsError;
let calls = [];
let onRead;
const timeout = () => new MongoServerError({ code: 50, message: "Fixture query timeout" });

globalThis.mapTest = {
  session: () => user ? { user } : null,
  inspections: {
    find(filter) {
      calls.push(["find", filter]);
      return {
        project() { return this; },
        sort() { return this; },
        maxTimeMS() { return this; },
        limit(limit) { calls.push(["limit", limit]); return this; },
        async toArray() {
          onRead?.();
          if (recordsError) throw recordsError;
          return records;
        },
      };
    },
    async countDocuments(filter) {
      calls.push(["count", filter]);
      if (countError) throw countError;
      return records.length;
    },
    async distinct(field, filter) {
      calls.push(["distinct", field, filter]);
      if (districtError) throw districtError;
      return ["Test district"];
    },
  },
  regions: { findOne: async ({ _id, isActive }) => active && isActive && String(_id) === regionId },
};

const mocks = {
  "next/server": "export const connection = async () => {}",
  "server-only": "",
  "@/lib/session": "export const getSession = globalThis.mapTest.session",
  "@/lib/rate-limit": "export const rateLimit = async () => null",
  "@/lib/audit": "export const audit = async () => {}",
  "@/lib/collections": "export const inspectionsCollection = globalThis.mapTest.inspections; export const regionsCollection = globalThis.mapTest.regions",
};

registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(mocks, specifier)) {
      return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) return next(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});

const { GET } = await import("../app/api/map/route.ts");
const request = (query = "", signal) => new Request(`https://dashboard.example.test/api/map${query}`, { signal });
const sample = { _id: new ObjectId(regionId), location: { district: "Test district" } };

test("initial map works without bounds when the district lookup times out", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  calls = [];
  records = [sample];
  districtError = timeout();
  try {
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true, data: [{ ...sample, _id: regionId }], total: 1, districts: null, truncated: false,
    });
    assert.deepEqual(calls[0][1]["location.longitude"], { $gte: -180, $lte: 180 });
    assert.deepEqual(calls.find(([kind]) => kind === "distinct").slice(1),
      ["location.district", { regionId, inspectorId: worker.id }]);
    assert.equal(calls.some(([kind]) => kind === "count"), false);
    assert.equal(log.mock.calls[0].arguments[1].operation, "district options");
  } finally {
    districtError = undefined;
  }
});

test("viewport filters preserve ownership, search, and dates when the exact count times out", async (t) => {
  t.mock.method(console, "error", () => {});
  calls = [];
  records = Array.from({ length: 1501 }, () => sample);
  countError = timeout();
  try {
    const response = await GET(request("?viewport=20,170,27,-175&search=abc&district=Test+district&start=2026-01-01&end=2026-01-01"));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.total, null);
    assert.equal(result.truncated, true);
    assert.equal(result.data.length, 1500);
    const filter = calls[0][1];
    assert.equal(filter.regionId, regionId);
    assert.equal(filter.inspectorId, worker.id);
    assert.equal(filter["location.district"], "Test district");
    assert.ok(filter.$or.length);
    assert.equal(filter.inspectedAt.$lt.toISOString(), "2026-01-01T18:00:00.000Z");
    assert.deepEqual(filter.$and, [{ $or: [{ "location.longitude": { $gte: 170 } }, { "location.longitude": { $lte: -175 } }] }]);
    assert.deepEqual(calls.find(([kind]) => kind === "count")[1], filter);
  } finally {
    countError = undefined;
    records = [];
  }
});

test("invalid filters and unauthorized requests never reach inspection queries", async () => {
  calls = [];
  for (const query of ["?viewport=0,2,3,2", "?start=2026-02-01&end=2026-01-01", "?district=%20"]) {
    assert.equal((await GET(request(query))).status, 400);
  }
  assert.equal((await GET(request("?region=1234567890abcdef01234567"))).status, 403);
  try {
    active = false;
    assert.equal((await GET(request())).status, 403);
    user = { ...worker, role: "researcher" };
    assert.equal((await GET(request())).status, 403);
    user = null;
    assert.equal((await GET(request())).status, 401);
    assert.deepEqual(calls, []);
  } finally {
    active = true;
    user = worker;
  }
});

test("primary timeouts are actionable and aborted requests aren't logged as failures", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  recordsError = timeout();
  try {
    const response = await GET(request("?viewport=20,88,27,93"));
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /Narrow the map area/);
    assert.equal(log.mock.calls.length, 1);

    const controller = new AbortController();
    onRead = () => controller.abort();
    assert.equal((await GET(request("", controller.signal))).status, 499);
    assert.equal(log.mock.calls.length, 1);
  } finally {
    recordsError = undefined;
    onRead = undefined;
  }
});
