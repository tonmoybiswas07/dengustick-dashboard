export const alertSeverities = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
] as const;

export const severityColors = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  high: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  critical: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export const alertTypeLabels = {
  positive_detection: "Positive Detection",
  overdue_task: "Overdue Task",
  task_assigned: "Task Assigned",
  task_due_soon: "Task Due Soon",
  prediction_failed: "Prediction Failed",
  review_completed: "Review Completed",
};

export const alertStatusColors = {
  active: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};