export const maxPredictionAttempts = 3;

export type InspectionPredictionJob = {
  status: "pending" | "processing" | "completed" | "failed";
  requestId: string;
  imageUrl: string;
  requestedBy: string;
  attempts: number;
  queuedAt: Date;
  leaseUntil?: Date;
  leaseId?: string;
  finishedAt?: Date;
  failure?: "service" | "invalid_response" | "evidence" | "attempt_limit" | "cancelled";
};

export const predictionUnlocked = {
  "predictionJob.status": { $nin: ["pending", "processing"] },
} as const;

export function publicPredictionJob(job?: InspectionPredictionJob) {
  if (!job) return undefined;
  const { status, imageUrl, attempts, failure } = job;
  return { status, imageUrl, attempts, failure };
}
