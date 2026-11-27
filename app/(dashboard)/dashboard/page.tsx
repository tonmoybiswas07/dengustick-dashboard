import { getSystemSettings } from "@/lib/settings";
import { requirePermission } from "@/lib/session";

import OverviewManager from "@/components/dashboard/overview/OverviewManager";

export default async function DashboardPage() {
  const session = await requirePermission(
    "dashboard:view"
  );

  const settings = await getSystemSettings();

  return (
    <OverviewManager
      defaultRange={settings.dashboardRange}
      userName={session.user.name}
      role={session.user.role}
    />
  );
}