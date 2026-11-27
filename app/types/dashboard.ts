import type {
  DetectionResult,
  InspectionStatus,
} from "@/app/types/inspection";

export interface DashboardStatistics {
  totalInspections: number;
  verifiedDetections: number;
  activeFieldWorkers: number | null;
  activeAlerts: number | null;
}

export interface InspectionTrend {
  date: string;
  inspections: number;
  verified: number;
}

export interface DetectionDistribution {
  name: string;
  value: number;
}

export interface RecentInspection {
  _id: string;
  inspectionId: string;
  inspectorName: string;
  district: string;
  area: string;
  detectionResult: DetectionResult | null;
  status: InspectionStatus;
  inspectedAt: string;
}

export interface PriorityAlert {
  _id: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  district: string;
  area: string;
  createdAt: string;
}

export interface DashboardData {
  statistics: DashboardStatistics;
  inspectionTrends: InspectionTrend[];
  detectionDistribution: DetectionDistribution[];
  recentInspections: RecentInspection[];
  priorityAlerts: PriorityAlert[];
  access: {
    inspections: boolean;
    alerts: boolean;
    workers: boolean;
  };
  updatedAt: string;
}