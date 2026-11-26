export const userRoles = [
  "admin",
  "health_authority",
  "supervisor",
  "field_worker",
  "researcher",
] as const;

export type UserRole = (typeof userRoles)[number];

export const roleLabels: Record<UserRole, string> = {
  admin: "System Administrator",
  health_authority: "Health Authority",
  supervisor: "Field Supervisor",
  field_worker: "Field Worker",
  researcher: "Researcher",
};