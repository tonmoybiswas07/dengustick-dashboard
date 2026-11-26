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
    "alerts:manage",
    "reports:create",
  ],

  health_authority: [
    "dashboard:view",
    "inspections:view",
    "map:view",
    "alerts:view",
    "analytics:view",
    "reports:view",
    "reports:export",
    "reports:create",
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
    "alerts:manage",
    "reports:create",
    "reports:export",
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
    "reports:create",
    "reports:export",
  ],
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  return role ? getPermissions(role).includes(permission) : false;
}

export function getPermissions(role: string): Permission[] {
  if (!Object.prototype.hasOwnProperty.call(rolePermissions, role)) return [];
  return rolePermissions[role as UserRole];
}
