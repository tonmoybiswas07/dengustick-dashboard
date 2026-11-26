import "server-only";

import { db } from "@/lib/db";

import type { Inspection } from "@/app/types/inspection";
import type { FieldTask } from "@/app/types/field-operation";
import type { Alert } from "@/app/types/alert";
import type { Report } from "@/app/types/report";

export const inspectionsCollection =
    db.collection<Omit<Inspection, "_id">>("inspections");

export const usersCollection =
    db.collection("user");

export const regionsCollection =
    db.collection("regions");

export const alertsCollection =
    db.collection<Omit<Alert, "_id">>("alerts");

export const reportsCollection =
    db.collection<Omit<Report, "_id">>("reports");

export const fieldTasksCollection =
    db.collection<Omit<FieldTask, "_id">>("field_tasks");