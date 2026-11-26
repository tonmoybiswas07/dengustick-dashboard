 import type { UserRole, Permission } from "@/app/types/auth";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard:view",
    "inspections:view",
    "inspections:create",
    "inspections:update",
    "inspections:delete",
    "map:view",
    "ai:review",
    "operations:manage",
    "alerts:view",
    "analytics:view",
    "reports:view",
    "reports:export",
    "models:evaluate",
    "users:manage",
    "settings:manage",
  ],

  health_authority: [
    "dashboard:view",
    "inspections:view",
    "map:view",
    "alerts:view",
    "analytics:view",
    "reports:view",
    "reports:export",
  ],

  supervisor: [
    "dashboard:view",
    "inspections:view",
    "inspections:create",
    "inspections:update",
    "map:view",
    "ai:review",
    "operations:manage",
    "alerts:view",
    "analytics:view",
    "reports:view",
  ],

  field_worker: [
    "dashboard:view",
    "inspections:view",
    "inspections:create",
    "map:view",
    "alerts:view",
  ],

  researcher: [
    "dashboard:view",
    "map:view",
    "analytics:view",
    "reports:view",
    "models:evaluate",
  ],
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (!role) return false;

  return (
    rolePermissions[role as UserRole]?.includes(permission) ?? false
  );
}

export function getPermissions(role: string): Permission[] {
  return rolePermissions[role as UserRole] ?? [];
}