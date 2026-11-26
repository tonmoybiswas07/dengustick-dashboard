import { requirePermission } from "@/lib/session";

import ReportManager from "@/components/dashboard/reports/ReportManager";

export default async function ReportsPage() {
  const session = await requirePermission(
    "reports:view"
  );

  return (
    <ReportManager
      role={session.user.role ?? ""}
    />
  );
}