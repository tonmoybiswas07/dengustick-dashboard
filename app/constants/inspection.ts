export const inspectionStatuses = [
  { label: "Pending", value: "pending" },
  { label: "Under Review", value: "under_review" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
] as const;

export const detectionResults = [
  { label: "Positive", value: "positive" },
  { label: "Negative", value: "negative" },
  { label: "Inconclusive", value: "inconclusive" },
] as const;

export const breedingSiteTypes = [
  { label: "Water Container", value: "water_container" },
  { label: "Discarded Tire", value: "discarded_tire" },
  { label: "Flower Pot", value: "flower_pot" },
  { label: "Drain", value: "drain" },
  { label: "Water Tank", value: "water_tank" },
  { label: "Other", value: "other" },
] as const;