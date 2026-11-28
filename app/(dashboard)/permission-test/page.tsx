import { PageHeader } from "@/components/dashboard/PageHeader";
import { requirePermission } from "@/lib/session";

export default async function PermissionTestPage() {
  const session = await requirePermission("users:manage");

  return (
    <div className="space-y-4">
      <PageHeader title="Permission test" />

      <p>Access granted successfully.</p>

      <p>Name: {session.user.name}</p>

      <p>Email: {session.user.email}</p>

      <p>Role: {session.user.role}</p>
    </div>
  );
}
