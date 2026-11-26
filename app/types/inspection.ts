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
  inspectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}