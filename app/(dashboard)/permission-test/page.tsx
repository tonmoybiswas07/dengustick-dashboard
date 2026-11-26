import { requirePermission } from "@/lib/session";

export default async function PermissionTestPage() {
  const session = await requirePermission("users:manage");

  return (
    <div className="space-y-3 p-6">
      <h1 className="text-2xl font-bold">
        Permission Test
      </h1>

      <p>Access granted successfully.</p>

      <p>Name: {session.user.name}</p>

      <p>Email: {session.user.email}</p>

      <p>Role: {session.user.role}</p>
    </div>
  );
}