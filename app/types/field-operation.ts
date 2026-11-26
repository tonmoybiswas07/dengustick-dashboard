export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface FieldTask {
  _id?: string;
  taskId: string;
  title: string;
  description: string;
  regionId: string;

  location: {
    address: string;
    district: string;
    area: string;
  };

  assignedTo: string;
  assignedToName: string;

  assignedBy: string;
  assignedByName: string;

  priority: TaskPriority;
  status: TaskStatus;

  inspectionId: string | null;

  deadline: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FieldWorker {
  id: string;
  name: string;
  email: string;
  regionId: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
}

export interface OperationStatistics {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface FieldTaskDTO
  extends Omit<
    FieldTask,
    "_id" | "deadline" | "completedAt" | "createdAt" | "updatedAt"
  > {
  _id: string;
  deadline: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}