export const reportTypes = [
  {
    label: "Surveillance Summary",
    value: "surveillance_summary",
  },
  {
    label: "Verified Detection",
    value: "verified_detection",
  },
  {
    label: "Field Operations",
    value: "field_operations",
  },
] as const;

export const reportTypeLabels = {
  surveillance_summary: "Surveillance Summary",
  verified_detection: "Verified Detection",
  field_operations: "Field Operations",
};

export const reportTypeColors = {
  surveillance_summary: "bg-teal-500/10 text-teal-600",
  verified_detection: "bg-blue-500/10 text-blue-600",
  field_operations: "bg-amber-500/10 text-amber-600",
};