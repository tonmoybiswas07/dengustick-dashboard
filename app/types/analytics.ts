export interface AnalyticsSummary {
  totalInspections: number;
  verifiedInspections: number;
  positiveDetections: number;
  negativeDetections: number;
  inconclusiveDetections: number;
  pendingInspections: number;
  rejectedInspections: number;
  positiveRate: number | null;
  totalLarvae: number;
}

export interface InspectionTrend {
  date: string;
  inspections: number;
  verified: number;
  positive: number;
}

export interface DetectionDistribution {
  name: string;
  value: number;
}

export interface DistrictAnalytics {
  district: string;
  total: number;
  verified: number;
  positive: number;
  negative: number;
}

export interface BreedingSiteAnalytics {
  type: string;
  total: number;
  positive: number;
}

export interface WorkerPerformance {
  inspectorId: string;
  inspectorName: string;
  totalInspections: number;
  verifiedInspections: number;
  positiveDetections: number;
  verificationRate: number;
}

export interface AnalyticsData {
  previousPeriod: { total: number; verifiedPositive: number } | null;
  summary: AnalyticsSummary;
  trends: InspectionTrend[];
  detectionDistribution: DetectionDistribution[];
  districts: DistrictAnalytics[];
  breedingSites: BreedingSiteAnalytics[];
  workers: WorkerPerformance[];
  availableDistricts: string[];
}