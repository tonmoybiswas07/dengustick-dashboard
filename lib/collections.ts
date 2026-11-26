import "server-only";
import type { FieldTask } from "@/app/types/field-operation";
import { db } from "@/lib/db";
import type { Inspection } from "@/app/types/inspection";

export const inspectionsCollection =
  db.collection<Omit<Inspection, "_id">>("inspections");

export const usersCollection = db.collection("user");

export const regionsCollection = db.collection("regions");

export const alertsCollection = db.collection("alerts");

export const reportsCollection = db.collection("reports");
export const fieldTasksCollection =
  db.collection<Omit<FieldTask, "_id">>("field_tasks");