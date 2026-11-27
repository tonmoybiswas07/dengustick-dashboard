import type { TaskStatus } from "@/app/types/field-operation";

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionTask(current: TaskStatus, next: TaskStatus) {
  return transitions[current]?.includes(next) ?? false;
}
