import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import sharp from "sharp";
import { inspectionSchema } from "../lib/validations/inspection.ts";
import { inspectionImageId } from "../lib/inspection-image-reference.mjs";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
    if (specifier === "@/lib/request-security") {
      return next(new URL("../lib/request-security.ts", import.meta.url).href, context);
    }
    return next(specifier, context);
  },
});
const { normalizeInspectionImage } = await import("../lib/image-intake.ts");

test("managed references accept canonical IDs and existing HTTPS image URLs", () => {
  const id = "0123456789abcdef01234567";
  const valid = `/api/inspection-images/${id}`;
  assert.equal(inspectionImageId(valid), id);
  for (const value of [valid, "https://images.example.test/example.jpg"]) {
    assert.ok(inspectionSchema.shape.images.safeParse([value]).success);
  }
  for (const value of [`${valid}?anything=1`, `//evil.example.test${valid}`, "https://user:pass@example.test/image.jpg"]) {
    assert.equal(inspectionSchema.shape.images.safeParse([value]).success, false);
  }
});

test("decodes and re-encodes valid evidence without ancillary metadata", async () => {
  const source = await sharp({
    create: { width: 12, height: 8, channels: 3, background: "#008080" },
  }).withMetadata().png().toBuffer();
  const image = await normalizeInspectionImage({ bytes: Uint8Array.from(source), type: "image/png" });
  const metadata = await sharp(image.bytes).metadata();
  assert.equal(image.type, "image/webp");
  assert.equal(metadata.width, 12);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(normalizeInspectionImage({ bytes: Uint8Array.from(source), type: "image/jpeg" }));
  await assert.rejects(normalizeInspectionImage({ bytes: Uint8Array.from(source.subarray(0, 25)), type: "image/png" }));
});

test("Cloudinary transport keeps storage credentials and signed delivery on the server", async () => {
  const { getImageStorage } = await import("../lib/cloudinary-images.ts");
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const original = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  const id = "denguestick/inspections/0123456789abcdef01234567";
  const requests = [];
  try {
    Object.assign(process.env, {
      CLOUDINARY_CLOUD_NAME: "test-cloud", CLOUDINARY_API_KEY: "test-key", CLOUDINARY_API_SECRET: "test-only-secret",
    });
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith("/upload")) return Response.json({ public_id: id, type: "authenticated", version: 1, format: "webp" });
      if (url.endsWith("/destroy")) return Response.json({ result: "not found" });
      return new Response("test", { headers: { "Content-Type": "image/webp" } });
    };
    const storage = getImageStorage();
    assert.deepEqual(await storage.put(id, { bytes: new Uint8Array(12), type: "image/webp" }), { version: 1 });
    await storage.get(id, 1);
    await storage.remove(id);
    assert.equal(requests[0].options.body.get("type"), "authenticated");
    assert.equal(requests[0].options.body.get("overwrite"), "false");
    assert.match(requests[0].options.body.get("signature"), /^[a-f0-9]{64}$/);
    assert.match(requests[1].url, /^https:\/\/res\.cloudinary\.com\/test-cloud\/image\/authenticated\/s--[\w-]{8}--\//);
    assert.ok(requests.every(({ options }) => options.redirect === "error"));
    await assert.rejects(storage.get("https://other.example.test/asset", 1));
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});

test("inference transport uses an idempotency key and rejects invalid boxes", async () => {
  const { getInferenceService } = await import("../lib/inference.ts");
  const keys = ["INFERENCE_API_URL", "INFERENCE_API_TOKEN", "INFERENCE_HEALTH_PATH", "INFERENCE_TIMEOUT_MS"];
  const original = keys.map((key) => process.env[key]);
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    Object.assign(process.env, {
      INFERENCE_API_URL: "https://inference.example.test/predict",
      INFERENCE_API_TOKEN: "test-token",
      INFERENCE_HEALTH_PATH: "/health",
      INFERENCE_TIMEOUT_MS: "1000",
    });
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.pathname === "/health") return new Response();
      return Response.json({
        result: "positive", confidence: 0.75, larvaeCount: 1, modelVersion: "test", predictionId: "test-response",
        boxes: [{ x: 0.8, y: 0, width: 0.4, height: 0.2 }],
      });
    };
    const service = getInferenceService();
    assert.equal(await service.health(), "available");
    await assert.rejects(service.predict({ bytes: new Uint8Array(12), type: "image/webp" }, "stable-id"),
      (error) => error.code === "invalid_response");
    assert.equal(calls[0].url.origin, calls[1].url.origin);
    assert.equal(calls[1].options.headers["Idempotency-Key"], "stable-id");
    assert.equal(calls[1].options.redirect, "error");
    assert.equal(calls.length, 2);
    process.env.INFERENCE_HEALTH_PATH = "//untrusted.example.test";
    assert.throws(getInferenceService, (error) => error.code === "configuration");
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, index) => {
      if (original[index] === undefined) delete process.env[key];
      else process.env[key] = original[index];
    });
  }
});
