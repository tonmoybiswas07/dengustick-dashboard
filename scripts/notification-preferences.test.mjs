import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "@/lib/settings") return {
      url: "data:text/javascript,export const getPersonalSettings = () => globalThis.inboxTestSettings",
      shortCircuit: true,
    };
    return nextResolve(specifier, context);
  },
});

const { getInboxFilter } = await import("../lib/notification-preferences.ts");

test("notification categories retain existing region and recipient filters", async () => {
  const scope = { regionId: "region", $or: [{ assignedTo: "owner" }] };
  globalThis.inboxTestSettings = { alertNotifications: true };
  assert.equal(await getInboxFilter("owner", scope), scope);

  globalThis.inboxTestSettings = { alertNotifications: true, notifyDeadline: false, notifyReview: false };
  assert.deepEqual(await getInboxFilter("owner", scope), {
    ...scope, type: { $nin: ["task_due_soon", "review_completed"] },
  });

  globalThis.inboxTestSettings = { alertNotifications: false };
  assert.deepEqual(await getInboxFilter("owner", scope), { ...scope, type: { $in: [] } });
});
