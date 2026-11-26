import { requirePermission } from "@/lib/session";

import AnalyticsManager from "@/components/dashboard/analytics/AnalyticsManager";

export default async function AnalyticsPage() {
  const session = await requirePermission(
    "analytics:view"
  );

  return (
    <AnalyticsManager
      role={session.user.role ?? ""}
    />
  );
}