import "server-only";

import { getRegionalScope } from "@/lib/permissions";
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
  const scope = getRegionalScope(user, "alerts:view");
  if (!scope) return null;
  const { ownerId, ...region } = scope;
  return ownerId ? { ...region, assignedTo: ownerId } : region;
}
