import { requirePermission } from "@/lib/session";

import FieldOperationsManager from "@/components/dashboard/field-operations/FieldOperationsManager";

export default async function FieldOperationsPage() {
  const session = await requirePermission(
    "operations:manage"
  );

  return (
    <FieldOperationsManager
      role={session.user.role ?? ""}
    />
  );
}