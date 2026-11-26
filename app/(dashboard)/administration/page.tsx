import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/session";

import AdminManager from "@/components/dashboard/administration/AdminManager";

export default async function AdministrationPage() {
  const session = await requirePermission(
    "users:manage"
  );

  if (
    session.user.role !== "admin" ||
    session.user.banned
  ) {
    redirect("/unauthorized");
  }

  return (
    <AdminManager
      currentUserId={session.user.id}
    />
  );
}