import "server-only";

import { z } from "zod";
import type { ValidatedImage } from "@/lib/image-intake";
import { readJSON } from "@/lib/request-security";

const predictionSchema = z.strictObject({
  result: z.enum(["positive", "negative", "inconclusive"]),
  confidence: z.number().min(0).max(1).nullable(),
  larvaeCount: z.number().int().min(0).max(1_000_000).nullable(),
  modelVersion: z.string().trim().min(1).max(100),
  predictionId: z.string().trim().min(1).max(128),
});

export type ModelPrediction = z.infer<typeof predictionSchema> & {
  source: "fastapi";
  inferredAt: Date;
};

export interface InferenceService {
  predict(image: ValidatedImage): Promise<ModelPrediction>;
}

export function getInferenceService(): InferenceService | null {
  const endpoint = process.env.INFERENCE_API_URL;
  const token = process.env.INFERENCE_API_TOKEN;
  if (!endpoint) return null;
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || !token) {
    throw new Error("Inference requires an administrator-configured HTTPS endpoint and service token");
  }

  return {
    async predict(image) {
      try {
        const form = new FormData();
        form.set("image", new Blob([image.bytes], { type: image.type }), "inspection-image");
        const response = await fetch(parsed, {
          method: "POST",
          body: form,
          headers: { Authorization: `Bearer ${token}` },
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Invalid inference status");
        const result = predictionSchema.parse(await readJSON(response));
        return { ...result, source: "fastapi", inferredAt: new Date() };
      } catch {
        throw new Error("Inference service unavailable or returned an invalid prediction");
      }
    },
  };
}
