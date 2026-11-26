import { requirePermission } from "@/lib/session";
import InspectionManager from "@/components/dashboard/inspections/InspectionManager";

export default async function InspectionsPage() {
  const session = await requirePermission("inspections:view");

  return (
    <InspectionManager
      role={session.user.role ?? ""}
      regionId={session.user.regionId ?? ""}
    />
  );
}