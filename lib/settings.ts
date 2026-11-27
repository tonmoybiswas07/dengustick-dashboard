import "server-only";

import { MongoServerError, type ClientSession } from "mongodb";
import { db } from "@/lib/db";
import { personalSettingsSchema, systemSettingsSchema } from "@/lib/validations/account";

export const settingsCollection = db.collection<{ _id: string; value: Record<string, unknown> }>("settings");

const personalDefaults = { theme: "light" as const, alertNotifications: true };
const systemDefaults = { dashboardRange: "7" as const, positiveDetectionAlerts: true, overdueTaskAlerts: true };

export function settingsFields(patch: Record<string, string | boolean>) {
  return Object.fromEntries(Object.entries(patch).map(([name, value]) => [`value.${name}`, value]));
}

export async function writeSettings(id: string, patch: Record<string, string | boolean>, session?: ClientSession) {
  const filter = { _id: id };
  const update = { $set: settingsFields(patch) };
  try {
    await settingsCollection.updateOne(filter, update, { upsert: true, session });
  } catch (error) {
    if (session || !(error instanceof MongoServerError) || error.code !== 11000) throw error;
    const result = await settingsCollection.updateOne(filter, update);
    if (!result.matchedCount) throw error;
  }
}

export async function getPersonalSettings(userId: string) {
  const result = personalSettingsSchema.safeParse(
    { ...personalDefaults, ...(await settingsCollection.findOne({ _id: `user:${userId}` }))?.value },
  );
  return result.success ? result.data : personalDefaults;
}

export async function getSystemSettings() {
  const result = systemSettingsSchema.safeParse({
    ...systemDefaults, ...(await settingsCollection.findOne({ _id: "system" }))?.value,
  });
  return result.success ? result.data : systemDefaults;
}
