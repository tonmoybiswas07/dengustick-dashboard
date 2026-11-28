import assert from "node:assert/strict";
import test from "node:test";
import { publicPredictionJob, predictionUnlocked } from "../lib/inspection-prediction-state.ts";
import { mapQuery } from "../lib/validations/map.ts";
import { analyticsDateQuery } from "../lib/validations/query.ts";

test("prediction API shape hides worker identifiers and leases", () => {
  assert.deepEqual(publicPredictionJob({
    status: "processing", imageUrl: "/api/inspection-images/reference", attempts: 1,
    requestId: "private-request-id", leaseId: "private-lease-id", queuedAt: new Date(),
    leaseUntil: new Date(), requestedBy: "private-user-id",
  }), { status: "processing", imageUrl: "/api/inspection-images/reference", attempts: 1, failure: undefined });
  assert.equal(publicPredictionJob(undefined), undefined);
  assert.deepEqual(predictionUnlocked["predictionJob.status"].$nin, ["pending", "processing"]);
});

test("map and analytics reject reversed, invalid and unbounded custom date inputs", () => {
  assert.equal(mapQuery.safeParse({ start: "2026-03-15", end: "2026-03-14" }).success, false);
  assert.equal(mapQuery.safeParse({ region: "$ne", status: "verified" }).success, false);
  assert.equal(mapQuery.safeParse({ start: "2026-03-14", end: "2026-03-15", status: "verified" }).success, true);
  assert.equal(analyticsDateQuery.safeParse({ start: "2026-01-01" }).success, false);
  assert.equal(analyticsDateQuery.safeParse({ start: "2024-01-01", end: "2026-03-14" }).success, false);
  assert.equal(analyticsDateQuery.safeParse({ start: "2026-01-01", end: "2026-02-01" }).success, true);
});

test("scheduled reports use completed Dhaka calendar periods", async () => {
  const { reportSchedulePeriod } = await import("../lib/report-schedule-period.ts");
  const now = new Date("2026-03-01T18:01:00.000Z");
  const weekly = reportSchedulePeriod("weekly", now);
  assert.equal(weekly.startDate, "2026-02-23");
  assert.equal(weekly.endDate, "2026-03-01");
  assert.equal(weekly.nextRunAt.toISOString(), "2026-03-08T18:00:00.000Z");
  const monthly = reportSchedulePeriod("monthly", now);
  assert.equal(monthly.startDate, "2026-02-01");
  assert.equal(monthly.endDate, "2026-02-28");
});
