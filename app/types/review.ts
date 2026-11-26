import type {
  InspectionDTO,
  DetectionResult,
} from "@/app/types/inspection";

export interface InspectionReview {
  reviewerId: string;
  reviewerName: string;
  decision: "verified" | "rejected";
  verifiedDetectionResult: DetectionResult | null;
  verifiedLarvaeCount: number | null;
  reviewNotes: string;
  reviewedAt: Date;
}

export type ReviewInspection = InspectionDTO;

export interface ReviewStatistics {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}