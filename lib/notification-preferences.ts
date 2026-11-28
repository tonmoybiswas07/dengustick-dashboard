import "server-only";

import type { Filter } from "mongodb";
import type { Alert, AlertType } from "@/app/types/alert";
import { getPersonalSettings } from "@/lib/settings";

export async function getInboxFilter(userId: string, scope: Filter<Omit<Alert, "_id">>): Promise<Filter<Omit<Alert, "_id">>> {
  const preferences = await getPersonalSettings(userId);
  if (!preferences.alertNotifications) return { ...scope, type: { $in: [] } };
  const excluded: AlertType[] = [];
  if (preferences.notifyPositive === false) excluded.push("positive_detection");
  if (preferences.notifyAssignment === false) excluded.push("task_assigned");
  if (preferences.notifyDeadline === false) excluded.push("task_due_soon");
  if (preferences.notifyOverdue === false) excluded.push("overdue_task");
  if (preferences.notifyPredictionFailure === false) excluded.push("prediction_failed");
  if (preferences.notifyReview === false) excluded.push("review_completed");
  return excluded.length ? { ...scope, type: { $nin: excluded } } : scope;
}
