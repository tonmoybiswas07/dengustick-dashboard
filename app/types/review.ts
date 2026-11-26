import type {
  Inspection,
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

export interface ReviewInspection
  extends Omit<
    Inspection,
    "_id" | "createdAt" | "updatedAt" | "inspectedAt" | "review"
  > {
  _id: string;
  createdAt: string;
  updatedAt: string;
  inspectedAt: string;
  review?: Omit<InspectionReview, "reviewedAt"> & {
    reviewedAt: string;
  };
}

export interface ReviewStatistics {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
}