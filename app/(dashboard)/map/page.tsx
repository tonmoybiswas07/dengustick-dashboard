import { requirePermission } from "@/lib/session";
import MapManager from "@/components/dashboard/map/MapManager";

export default async function MapPage() {
  const session = await requirePermission("map:view");

  return (
    <MapManager role={session.user.role ?? ""} />
  );
}