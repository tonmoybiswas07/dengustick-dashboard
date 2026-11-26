import type { InspectionReview } from "@/app/types/review";

export type InspectionStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected";

export type DetectionResult =
  | "positive"
  | "negative"
  | "inconclusive";

export type BreedingSiteType =
  | "water_container"
  | "discarded_tire"
  | "flower_pot"
  | "drain"
  | "water_tank"
  | "other";

export interface Inspection {
  _id?: string;
  inspectionId: string;
  inspectorId: string;
  inspectorName: string;
  regionId: string;

  location: {
    address: string;
    district: string;
    area: string;
    latitude: number;
    longitude: number;
  };

  breedingSiteType: BreedingSiteType;
  images: string[];
  detectionResult: DetectionResult;
  larvaeCount: number | null;
  confidenceScore: number | null;
  status: InspectionStatus;
  notes: string;

  review?: InspectionReview;

  inspectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionDTO
  extends Omit<Inspection, "_id" | "createdAt" | "updatedAt" | "inspectedAt" | "review"> {
  _id: string;
  createdAt: string;
  updatedAt: string;
  inspectedAt: string;
  review?: Omit<InspectionReview, "reviewedAt"> & { reviewedAt: string };
}
