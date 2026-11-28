import "server-only";

import { getSystemSettings } from "@/lib/settings";
import { randomUUID } from "crypto";
import { MongoServerError, type ClientSession, type Document, type Filter, type WithId } from "mongodb";

import {
  alertsCollection,
  inspectionsCollection,
  fieldTasksCollection,
} from "@/lib/collections";

import type { Alert } from "@/app/types/alert";
import type { Inspection } from "@/app/types/inspection";
import type { FieldTask } from "@/app/types/field-operation";

type AlertInput = Omit<
  Alert,
  "_id" |
  "alertId" |
  "status" |
  "readBy" |
  "resolvedBy" |
  "resolvedByName" |
  "resolutionNotes" |
  "resolvedAt" |
  "createdAt" |
  "updatedAt"
>;

export async function createAlert(data: AlertInput, session?: ClientSession) {
  const now = new Date();

  const alert: Omit<Alert, "_id"> = {
    ...data,
    alertId: `ALT-${randomUUID()}`,
    status: "active",
    readBy: [],
    resolvedBy: null,
    resolvedByName: null,
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const result = await alertsCollection.updateOne(
      {
        type: data.type,
        sourceId: data.sourceId,
      },
      {
        $setOnInsert: alert,
      },
      {
        upsert: true, session,
      }
    );

    return result.upsertedCount;
  } catch (error) {
    if (
      !session && error instanceof MongoServerError &&
      error.code === 11000 &&
      error.keyPattern?.type === 1 &&
      error.keyPattern?.sourceId === 1
    ) {
      return 0;
    }
    throw error;
  }
}

const syncBatchSize = 250;

function unsyncedSources(filter: Document, type: Alert["type"]) {
  return [
    { $match: filter },
    { $set: { sourceKey: { $toString: "$_id" } } },
    {
      $lookup: {
        from: "alerts",
        localField: "sourceKey",
        foreignField: "sourceId",
        pipeline: [{ $match: { type } }, { $project: { _id: 1 } }, { $limit: 1 }],
        as: "existingAlert",
      },
    },
    { $match: { "existingAlert.0": { $exists: false } } },
    { $limit: syncBatchSize + 1 },
    { $unset: ["sourceKey", "existingAlert"] },
  ];
}

export async function syncAlerts(regionId?: string) {
  const settings = await getSystemSettings();

  const regionFilter = regionId
    ? { regionId }
    : {};

  const inspectionFilter: Filter<
    Omit<Inspection, "_id">
  > = {
    ...regionFilter,
    status: "verified",
    "review.verifiedDetectionResult": "positive",
  };

  const taskFilter: Filter<
    Omit<FieldTask, "_id">
  > = {
    ...regionFilter,
    status: {
      $in: ["assigned", "in_progress"],
    },
    deadline: {
      $lt: new Date(),
    },
  };

  const [inspections, tasks, upcoming] = await Promise.all([
    settings.positiveDetectionAlerts
      ? inspectionsCollection.aggregate<WithId<Inspection>>(unsyncedSources(inspectionFilter, "positive_detection"), { maxTimeMS: 15_000 }).toArray()
      : [],
    settings.overdueTaskAlerts
      ? fieldTasksCollection.aggregate<WithId<FieldTask>>(unsyncedSources(taskFilter, "overdue_task"), { maxTimeMS: 15_000 }).toArray()
      : [],
    settings.overdueTaskAlerts
      ? fieldTasksCollection.aggregate<WithId<FieldTask>>(unsyncedSources({
        ...regionFilter, status: taskFilter.status,
        deadline: { $gte: new Date(), $lte: new Date(Date.now() + 86_400_000) },
      }, "task_due_soon"), { maxTimeMS: 15_000 }).toArray()
      : [],
  ]);
  let created = 0;

  for (const inspection of inspections.slice(0, syncBatchSize)) {
    created += await createAlert({
      title: "Verified Positive Detection",

      message: `Mosquito larvae were confirmed during an inspection in ${inspection.location.area}, ${inspection.location.district}.`,

      type: "positive_detection",
      severity: "high",

      regionId: inspection.regionId,

      sourceId: inspection._id.toString(),
      sourceType: "inspection",

      assignedTo: inspection.inspectorId,

      location: {
        district: inspection.location.district,
        area: inspection.location.area,
      },
    });
  }

  for (const task of tasks.slice(0, syncBatchSize)) {
    created += await createAlert({
      title: "Overdue Field Task",

      message: `The task "${task.title}" assigned to ${task.assignedToName} has exceeded its deadline.`,

      type: "overdue_task",

      severity:
        task.priority === "urgent" ||
        task.priority === "high"
          ? "high"
          : "medium",

      regionId: task.regionId,

      sourceId: task._id.toString(),
      sourceType: "field_task",

      assignedTo: task.assignedTo,

      location: {
        district: task.location.district,
        area: task.location.area,
      },
    });
  }

  for (const task of upcoming.slice(0, syncBatchSize)) {
    created += await createAlert({
      title: "Field Task Due Soon", message: `The task "${task.title}" is due within 24 hours.`,
      type: "task_due_soon", severity: "medium", regionId: task.regionId,
      sourceId: task._id.toString(), sourceType: "field_task", assignedTo: task.assignedTo,
      location: { district: task.location.district, area: task.location.area },
    });
  }
  return { created, hasMore: inspections.length > syncBatchSize || tasks.length > syncBatchSize || upcoming.length > syncBatchSize };
}