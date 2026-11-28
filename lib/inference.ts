import "server-only";

import { z } from "zod";
import type { ValidatedImage } from "@/lib/image-intake";
import { readJSON } from "@/lib/request-security";

const boundingBox = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
  confidence: z.number().min(0).max(1).optional(),
}).refine((box) => box.x + box.width <= 1 && box.y + box.height <= 1);

const predictionSchema = z.strictObject({
  result: z.enum(["positive", "negative", "inconclusive"]),
  confidence: z.number().min(0).max(1).nullable(),
  larvaeCount: z.number().int().min(0).max(1_000_000).nullable(),
  modelVersion: z.string().trim().min(1).max(100),
  modelName: z.string().trim().min(1).max(100).optional(),
  predictionId: z.string().trim().min(1).max(128),
  durationMs: z.number().int().nonnegative().max(600_000).optional(),
  boxes: z.array(boundingBox).max(100).optional(),
  annotatedImageId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).optional(),
});

export type ModelPrediction = z.infer<typeof predictionSchema> & {
  source: "fastapi";
  inferredAt: Date;
};

type InferenceErrorCode = "configuration" | "transport" | "timeout" | "rejected" | "unavailable" | "invalid_response";

export class InferenceError extends Error {
  readonly code: InferenceErrorCode;

  constructor(code: InferenceErrorCode) {
    super(`Inference failure: ${code}`);
    this.code = code;
  }
}

export interface InferenceService {
  predict(image: ValidatedImage, requestId: string): Promise<ModelPrediction>;
  annotation(id: string): Promise<Response | null>;
  health(): Promise<"available" | "unavailable" | "not_configured">;
}

export function getInferenceService(): InferenceService | null {
  const endpoint = process.env.INFERENCE_API_URL;
  const token = process.env.INFERENCE_API_TOKEN;
  if (!endpoint || !token) return null;
  const parsed = URL.parse(endpoint);
  const timeout = Number(process.env.INFERENCE_TIMEOUT_MS || "15000");
  const health = process.env.INFERENCE_HEALTH_PATH;
  const annotation = process.env.INFERENCE_ANNOTATION_PATH;
  const safePath = /^\/(?:[\w-]+\/)*[\w-]+$/;
  if (!parsed || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash ||
      !Number.isSafeInteger(timeout) || timeout < 1000 || timeout > 60_000 ||
      (health && !safePath.test(health)) || (annotation && !safePath.test(annotation))) {
    throw new InferenceError("configuration");
  }

  async function send(url: URL, init?: RequestInit) {
    try {
      return await fetch(url, {
        ...init, headers: { Authorization: `Bearer ${token}`, ...init?.headers },
        redirect: "error", signal: AbortSignal.timeout(timeout), cache: "no-store",
      });
    } catch (error) {
      throw new InferenceError(error instanceof Error && error.name === "TimeoutError" ? "timeout" : "transport");
    }
  }

  return {
    async predict(image, requestId) {
      if (!/^[\w-]{1,128}$/.test(requestId)) throw new InferenceError("configuration");
      const form = new FormData();
      form.set("image", new Blob([image.bytes], { type: image.type }), "inspection-image");
      const response = await send(parsed, {
        method: "POST", body: form, headers: { "Idempotency-Key": requestId },
      });
      if (!response.ok) throw new InferenceError(
        response.status === 429 || response.status >= 500 ? "unavailable" : "rejected",
      );
      const payload = await readJSON(response).catch(() => null);
      const result = predictionSchema.safeParse(payload);
      if (!result.success) throw new InferenceError("invalid_response");
      return { ...result.data, source: "fastapi", inferredAt: new Date() };
    },
    async annotation(id) {
      if (!annotation || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return null;
      const result = await send(new URL(`${annotation}/${id}`, parsed.origin));
      if (!result.ok) {
        void result.body?.cancel().catch(() => {});
        return null;
      }
      return result;
    },
    async health() {
      if (!health) return "not_configured";
      try {
        const response = await send(new URL(health, parsed.origin));
        void response.body?.cancel().catch(() => {});
        return response.ok ? "available" : "unavailable";
      } catch {
        return "unavailable";
      }
    },
  };
}
