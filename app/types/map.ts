import type {
  DetectionResult,
  InspectionStatus,
  BreedingSiteType,
} from "@/app/types/inspection";

export interface MapInspection {
  _id: string;
  inspectionId: string;
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
  detectionResult: DetectionResult;
  status: InspectionStatus;
  larvaeCount: number | null;
  confidenceScore: number | null;
  inspectedAt: string;
}