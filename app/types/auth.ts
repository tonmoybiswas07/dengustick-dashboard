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
    | "operations:manage"
    | "alerts:view"
    | "analytics:view"
    | "reports:view"
    | "reports:export"
    | "models:evaluate"
    | "users:manage"
    | "settings:manage"
    | "alerts:manage"
    | "reports:create";