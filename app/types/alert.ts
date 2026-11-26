export type AlertType =
  | "positive_detection"
  | "overdue_task";

export type AlertSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AlertStatus =
  | "active"
  | "resolved";

export interface Alert {
  _id?: string;
  alertId: string;
  title: string;
  message: string;

  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;

  regionId: string;

  sourceId: string;
  sourceType: "inspection" | "field_task";

  assignedTo: string | null;

  location: {
    district: string;
    area: string;
  };

  readBy: string[];

  resolvedBy: string | null;
  resolvedByName: string | null;
  resolutionNotes: string | null;
  resolvedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface AlertDTO
  extends Omit<
    Alert,
    "_id" | "createdAt" | "updatedAt" |
    "resolvedAt" | "readBy"
  > {
  _id: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  isRead: boolean;
}

export interface AlertStatistics {
  total: number;
  unread: number;
  active: number;
  highPriority: number;
  resolved: number;
}