import assert from "node:assert/strict";
import test from "node:test";
import { mapQuery } from "../lib/validations/map.ts";

test("map viewport validates coordinates and accepts antimeridian crossing", () => {
  assert.deepEqual(mapQuery.parse({ viewport: "-12,170,24,-175" }).viewport,
    { south: -12, west: 170, north: 24, east: -175 });
  for (const value of ["-91,0,40,120", "2,-181,40,120", "2,0,1,120", "0,2,3,2", "0,2,3,NaN", "0,2,3,4,5"]) {
    assert.equal(mapQuery.safeParse({ viewport: value }).success, false);
  }
});
