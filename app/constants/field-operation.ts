export const taskPriorities = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
] as const;

export const taskStatuses = [
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
] as const;

export const priorityColors = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  high: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  urgent: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export const taskStatusColors = {
  assigned: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};