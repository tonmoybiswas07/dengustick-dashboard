export type ReportType =
  | "surveillance_summary"
  | "verified_detection"
  | "field_operations";

export interface ReportMetric {
  label: string;
  value: string | number;
}

export interface ReportSnapshot {
  metrics: ReportMetric[];
  columns: string[];
  rows: (string | number)[][];
}

export interface Report {
  _id?: string;
  reportId: string;
  title: string;
  type: ReportType;

  filters: {
    startDate: string;
    endDate: string;
    district: string;
  };

  regionId: string | null;

  generatedBy: string;
  generatedByName: string;

  snapshot: ReportSnapshot;

  createdAt: Date;
}

export interface ReportDTO
  extends Omit<Report, "_id" | "createdAt"> {
  _id: string;
  createdAt: string;
}

export type ReportListItem = Omit<
  ReportDTO,
  "snapshot"
>;

export interface ReportStatistics {
  total: number;
  generatedByMe: number;
  thisMonth: number;
}