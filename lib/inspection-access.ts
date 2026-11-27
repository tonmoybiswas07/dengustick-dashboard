import "server-only";

import { getRegionalScope } from "@/lib/permissions";
import type { Filter } from "mongodb";
import type { Inspection } from "@/app/types/inspection";

type InspectionUser = {
  id: string;
  role?: string | null;
  regionId?: string | null;
};

export function getInspectionFilter(
  user: InspectionUser
): Filter<Omit<Inspection, "_id">> | null {
  const scope = getRegionalScope(user, "inspections:view");
  if (!scope) return null;
  const { ownerId, ...region } = scope;
  return ownerId ? { ...region, inspectorId: ownerId } : region;
}
