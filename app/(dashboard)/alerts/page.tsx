import { requirePermission } from "@/lib/session";

import AlertManager from "@/components/dashboard/alerts/AlertManager";

export default async function AlertsPage() {
  const session = await requirePermission(
    "alerts:view"
  );

  return (
    <AlertManager role={session.user.role ?? ""} />
  );
}