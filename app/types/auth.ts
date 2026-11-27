export type UserRole =
  | "admin"
  | "health_authority"
  | "supervisor"
  | "field_worker"
  | "researcher";

export type Permission =
  | "dashboard:view"
  | "inspections:view"
  | "inspections:create"
  | "inspections:update"
  | "inspections:delete"
  | "map:view"
  | "ai:review"
  | "operations:view"
  | "operations:manage"
  | "operations:update"
  | "alerts:view"
  | "alerts:manage"
  | "analytics:view"
  | "reports:view"
  | "reports:create"
  | "reports:export"
  | "models:evaluate"
  | "users:manage"
  | "settings:manage";