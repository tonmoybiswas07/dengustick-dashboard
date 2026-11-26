export const alertSeverities = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

export const severityColors = {
  low: "bg-slate-500/10 text-slate-500",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-amber-500/10 text-amber-600",
  critical: "bg-red-500/10 text-red-600",
};

export const alertTypeLabels = {
  positive_detection: "Positive Detection",
  overdue_task: "Overdue Task",
};

export const alertStatusColors = {
  active: "bg-amber-500/10 text-amber-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
};