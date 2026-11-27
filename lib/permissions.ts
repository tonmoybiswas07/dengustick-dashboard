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
    "operations:view",
    "operations:manage",
    "operations:update",
    "alerts:view",
    "alerts:manage",
    "analytics:view",
    "reports:view",
    "reports:create",
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
    "reports:create",
    "reports:export",
  ],

  supervisor: [
    "dashboard:view",
    "inspections:view",
    "inspections:create",
    "inspections:update",
    "map:view",
    "ai:review",
    "operations:view",
    "operations:manage",
    "operations:update",
    "alerts:view",
    "alerts:manage",
    "analytics:view",
    "reports:view",
    "reports:create",
    "reports:export",
  ],

  field_worker: [
    "dashboard:view",
    "inspections:view",
    "inspections:create",
    "map:view",
    "operations:view",
    "operations:update",
    "alerts:view",
  ],

  researcher: [
    "dashboard:view",
    "analytics:view",
    "reports:view",
    "reports:create",
    "reports:export",
    "models:evaluate",
  ],
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  return role
    ? getPermissions(role).includes(permission)
    : false;
}

export function getPermissions(role: string): Permission[] {
  if (!Object.prototype.hasOwnProperty.call(rolePermissions, role)) {
    return [];
  }

  return [...rolePermissions[role as UserRole]];
}
type ScopedUser = { id: string; role?: string | null; regionId?: string | null };

export function getRegionalScope(user: ScopedUser, permission: Permission) {
  if (!hasPermission(user.role, permission)) return null;
  if (user.role === "admin") return {};
  if (!user.regionId) return null;
  return user.role === "field_worker"
    ? { regionId: user.regionId, ownerId: user.id }
    : { regionId: user.regionId };
}
