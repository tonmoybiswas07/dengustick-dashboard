import "server-only";

import type { Filter } from "mongodb";
import type { Alert } from "@/app/types/alert";

interface AlertUser {
  id: string;
  role?: string | null;
  regionId?: string | null;
}

export function getAlertFilter(
  user: AlertUser
): Filter<Omit<Alert, "_id">> | null {
  if (user.role === "admin") {
    return {};
  }

  if (!user.regionId) {
    return null;
  }

  if (user.role === "field_worker") {
    return {
      regionId: user.regionId,
      assignedTo: user.id,
    };
  }

  return {
    regionId: user.regionId,
  };
}