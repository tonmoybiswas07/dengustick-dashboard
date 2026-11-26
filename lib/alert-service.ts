import "server-only";

import { randomUUID } from "crypto";
import type { Filter } from "mongodb";

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

export async function createAlert(data: AlertInput) {
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

  const result = await alertsCollection.updateOne(
    {
      type: data.type,
      sourceId: data.sourceId,
    },
    {
      $setOnInsert: alert,
    },
    {
      upsert: true,
    }
  );

  return result.upsertedCount;
}

export async function syncAlerts(regionId?: string) {
  await alertsCollection.createIndex(
    {
      type: 1,
      sourceId: 1,
    },
    {
      unique: true,
    }
  );

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

  let created = 0;

  for await (const inspection of inspectionsCollection.find(
    inspectionFilter
  )) {
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

  for await (const task of fieldTasksCollection.find(
    taskFilter
  )) {
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

  return { created };
}