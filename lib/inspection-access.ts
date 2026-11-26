import "server-only";

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
  if (user.role === "admin") {
    return {};
  }

  if (!user.regionId) {
    return null;
  }

  if (user.role === "field_worker") {
    return {
      regionId: user.regionId,
      inspectorId: user.id,
    };
  }

  return {
    regionId: user.regionId,
  };
}