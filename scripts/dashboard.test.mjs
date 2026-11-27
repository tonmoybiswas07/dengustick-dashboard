import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, getRegionalScope } from "../lib/permissions.ts";
import { calculateMetrics } from "../lib/model-evaluation.ts";
import { canTransitionTask } from "../lib/task-status.ts";
import {
  profileSchema,
  passwordSchema,
  personalSettingsSchema,
} from "../lib/validations/account.ts";
import { inspectionSchema } from "../lib/validations/inspection.ts";

test("unknown and inherited role names grant no permissions", () => {
  for (const role of [
    undefined,
    null,
    "",
    "constructor",
    "__proto__",
    "admin,field_worker",
    "unknown",
  ]) {
    assert.equal(hasPermission(role, "dashboard:view"), false);
    assert.equal(hasPermission(role, "settings:manage"), false);
  }
});

test("scope rejects unassigned users and limits field workers to their own records", () => {
  assert.deepEqual(
    getRegionalScope({ id: "admin", role: "admin" }, "inspections:view"),
    {},
  );
  assert.equal(
    getRegionalScope({ id: "s", role: "supervisor" }, "inspections:view"),
    null,
  );
  assert.deepEqual(
    getRegionalScope(
      { id: "h", role: "health_authority", regionId: "north" },
      "inspections:view",
    ),
    { regionId: "north" },
  );
  assert.deepEqual(
    getRegionalScope(
      { id: "w", role: "field_worker", regionId: "south" },
      "inspections:view",
    ),
    { regionId: "south", ownerId: "w" },
  );
  assert.equal(
    getRegionalScope(
      { id: "r", role: "researcher", regionId: "south" },
      "inspections:view",
    ),
    null,
  );
  assert.equal(hasPermission("researcher", "map:view"), false);
});

test("profile and preferences reject privileged fields and unsafe avatars", () => {
  const profile = { name: "Test User", image: null };
  assert.deepEqual(profileSchema.parse(profile), profile);
  for (const fields of [
    { role: "admin" },
    { regionId: "other" },
    { banned: false },
    { emailVerified: true },
  ]) {
    assert.equal(
      profileSchema.safeParse({ ...profile, ...fields }).success,
      false,
    );
  }
  for (const image of [
    "http://public.test/a.png",
    "javascript:alert(1)",
    "https://user:pass@public.test/a.png",
  ]) {
    assert.equal(profileSchema.safeParse({ ...profile, image }).success, false);
  }
  assert.equal(
    personalSettingsSchema.safeParse({
      theme: "dark",
      alertNotifications: true,
      owner: "different",
    }).success,
    false,
  );
});

test("password validation checks length, confirmation and reuse", () => {
  const newPassword = "a-new-password";
  assert.equal(
    passwordSchema.safeParse({
      currentPassword: "old",
      newPassword,
      confirmation: newPassword,
    }).success,
    true,
  );
  assert.equal(
    passwordSchema.safeParse({
      currentPassword: "old",
      newPassword,
      confirmation: "different",
    }).success,
    false,
  );
  assert.equal(
    passwordSchema.safeParse({
      currentPassword: newPassword,
      newPassword,
      confirmation: newPassword,
    }).success,
    false,
  );
});

test("inspection input rejects out-of-range coordinates and future timestamps", () => {
  const inspection = {
    regionId: "region",
    location: {
      address: "123 Main Street",
      district: "Dhaka",
      area: "Central",
      latitude: 23,
      longitude: 90,
    },
    breedingSiteType: "water_container",
    inspectedAt: "2020-01-01T00:00:00Z",
  };
  assert.equal(inspectionSchema.safeParse(inspection).success, true);
  assert.equal(
    inspectionSchema.safeParse({
      ...inspection,
      inspectedAt: "2099-01-01T00:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    inspectionSchema.safeParse({
      ...inspection,
      location: { ...inspection.location, latitude: 91 },
    }).success,
    false,
  );
});

test("task transitions reject direct completion and reopening", () => {
  assert.equal(canTransitionTask("assigned", "completed"), false);
  assert.equal(canTransitionTask("assigned", "in_progress"), true);
  assert.equal(canTransitionTask("in_progress", "completed"), true);
  assert.equal(canTransitionTask("completed", "in_progress"), false);
  assert.equal(canTransitionTask("cancelled", "assigned"), false);
});

test("model metrics use the confusion matrix and handle zero denominators", () => {
  assert.deepEqual(calculateMetrics({ tp: 20, tn: 15, fp: 5, fn: 10 }), {
    accuracy: 70,
    precision: 80,
    recall: 66.67,
    f1Score: 72.73,
    specificity: 75,
  });
  assert.deepEqual(calculateMetrics({ tp: 0, tn: 0, fp: 0, fn: 0 }), {
    accuracy: null,
    precision: null,
    recall: null,
    f1Score: null,
    specificity: null,
  });
});

test("list queries reject malformed page numbers, oversize values and invalid filters", async () => {
  const { inspectionQuery, alertQuery } =
    await import("../lib/validations/query.ts");
  assert.deepEqual(inspectionQuery.parse({}), {
    page: 1,
    limit: 10,
    search: "",
    status: "all",
  });
  assert.equal(inspectionQuery.safeParse({ page: "9books" }).success, false);
  assert.equal(inspectionQuery.safeParse({ page: "1001" }).success, false);
  assert.equal(inspectionQuery.safeParse({ limit: "101" }).success, false);
  assert.equal(alertQuery.safeParse({ status: "archived" }).success, false);
});
