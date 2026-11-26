export const userRoles = [
  {
    label: "Administrator",
    value: "admin",
  },
  {
    label: "Health Authority",
    value: "health_authority",
  },
  {
    label: "Supervisor",
    value: "supervisor",
  },
  {
    label: "Field Worker",
    value: "field_worker",
  },
  {
    label: "Researcher",
    value: "researcher",
  },
] as const;

export const roleLabels = {
  admin: "Administrator",
  health_authority: "Health Authority",
  supervisor: "Supervisor",
  field_worker: "Field Worker",
  researcher: "Researcher",
};

export const roleColors = {
  admin: "bg-violet-500/10 text-violet-600",
  health_authority: "bg-blue-500/10 text-blue-600",
  supervisor: "bg-teal-500/10 text-teal-600",
  field_worker: "bg-amber-500/10 text-amber-600",
  researcher: "bg-indigo-500/10 text-indigo-600",
};

export const divisions = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];