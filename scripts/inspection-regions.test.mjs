import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { ObjectId } from "mongodb";

const assigned = new ObjectId("0123456789abcdef01234567");
const other = new ObjectId("1234567890abcdef01234567");
const inactive = new ObjectId("2345678901abcdef01234567");
const rows = [
  { _id: assigned, isActive: true, name: "A region", code: "REG-001", district: "Dhaka", description: "Internal details" },
  { _id: other, isActive: true, name: "B region", code: "REG-002", district: "Rangpur" },
  { _id: inactive, isActive: false, name: "C region", code: "REG-003", district: "Sylhet" },
];
let user;
let lookup;
globalThis.inspectionRegionTest = {
  session: () => user ? { user } : null,
  collection: {
    async findOne({ _id, isActive }) {
      return rows.find((row) => row._id.equals(_id) && row.isActive === isActive);
    },
    find(filter, options) {
      lookup = { filter, options };
      return {
        sort() { return this; },
        skip(skip) { lookup.skip = skip; return this; },
        limit(limit) { lookup.limit = limit; return this; },
        async toArray() {
          return rows.filter((row) => row.isActive === filter.isActive &&
            (!filter._id || filter._id.$in.some((id) => row._id.equals(id)))).slice(lookup.skip, lookup.skip + lookup.limit);
        },
      };
    },
  },
};
const mocks = {
  "next/server": "export const connection = async () => {}",
  "server-only": "",
  "@/lib/session": "export const getSession = globalThis.inspectionRegionTest.session",
  "@/lib/audit": "export const audit = async () => {}",
  "@/lib/rate-limit": "export const rateLimit = async () => null",
  "@/lib/collections": "export const regionsCollection = globalThis.inspectionRegionTest.collection",
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

const { GET } = await import("../app/api/inspections/regions/route.ts");
const request = (query = "") => new Request(`https://dashboard.example.test/api/inspections/regions${query}`);

test("administrators receive active region labels and actual MongoDB IDs", async () => {
  user = { id: "admin", role: "admin" };
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [
    { id: String(assigned), name: "A region", code: "REG-001", district: "Dhaka" },
    { id: String(other), name: "B region", code: "REG-002", district: "Rangpur" },
  ], pagination: { hasNext: false } });
  assert.deepEqual(lookup.options.projection, { _id: 1, name: 1, code: 1, district: 1 });
  assert.equal(lookup.limit, 51);
  assert.equal(ObjectId.isValid(rows[0].code), false);
});

test("field worker can retrieve only their assigned region despite a supplied region ID", async () => {
  user = { id: "worker", role: "field_worker", regionId: String(assigned) };
  const response = await GET(request(`?regionId=${other}`));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.map(({ id }) => id), [String(assigned)]);
  assert.deepEqual(lookup.filter, { isActive: true, _id: { $in: [assigned] } });
});

test("researchers, missing sessions, and inactive assignments cannot access the directory", async () => {
  lookup = undefined;
  user = { id: "worker", role: "field_worker", regionId: String(inactive) };
  assert.equal((await GET(request())).status, 403);
  user = { id: "researcher", role: "researcher", regionId: String(assigned) };
  assert.equal((await GET(request())).status, 403);
  user = null;
  assert.equal((await GET(request())).status, 401);
  assert.equal(lookup, undefined);
});

test("authenticated same-origin navigation and fetch tolerate a development auth-origin mismatch", async () => {
  const previous = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  user = { id: "worker", role: "field_worker", regionId: String(assigned) };
  try {
    const local = "http://127.0.0.1:3001";
    for (const headers of [{ Origin: local, "Sec-Fetch-Site": "same-origin" }, { "Sec-Fetch-Site": "none" }]) {
      const response = await GET(new Request(`${local}/api/inspections/regions`, { headers }));
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).data.map(({ id }) => id), [String(assigned)]);
    }
  } finally {
    if (previous === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = previous;
  }
});
