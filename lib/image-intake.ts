import "server-only";

import sharp from "sharp";
import { maxInspectionImageBytes as maxBytes } from "./inspection-image-reference.mjs";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export type ValidatedImage = { bytes: Uint8Array<ArrayBuffer>; type: ImageMime };
const maxPixels = 16_000_000;

type DecodeImage = (
  file: ValidatedImage,
  maxPixels: number,
) => Promise<{ image: ValidatedImage; width: number; height: number }>;

export interface InspectionImageStorage {
  put(key: string, image: ValidatedImage): Promise<{ version: number }>;
  get(key: string, version: number): Promise<Response>;
  remove(key: string): Promise<void>;
}

function hasSignature(bytes: Uint8Array, type: ImageMime) {
  const matches = (offset: number, signature: number[]) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  switch (type) {
    case "image/jpeg":
      return matches(0, [255, 216, 255]) && matches(bytes.length - 2, [255, 217]);
    case "image/png":
      return matches(0, [137, 80, 78, 71, 13, 10, 26, 10]);
    case "image/webp":
      return matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]);
    default:
      return false;
  }
}

export async function validateInspectionImage(file: ValidatedImage, decodeAndStripMetadata: DecodeImage) {
  if (file.bytes.length < 12 || file.bytes.length > maxBytes || !hasSignature(file.bytes, file.type)) {
    throw new Error("Unsupported image or invalid file size");
  }
  const { image, width, height } = await decodeAndStripMetadata(file, maxPixels);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width * height > maxPixels || image.bytes.length < 12 || image.bytes.length > maxBytes ||
      !hasSignature(image.bytes, image.type)) {
    throw new Error("Invalid decoded image");
  }
  return image;
}

export async function normalizeInspectionImage(file: ValidatedImage, edge = 1920) {
  return validateInspectionImage(file, async (input, limitInputPixels) => {
    const source = sharp(input.bytes, { limitInputPixels, failOn: "warning" });
    const metadata = await source.metadata();
    const expected = input.type.slice("image/".length);
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Unsupported image content");
    const { data, info } = await source.rotate().resize({
      width: edge, height: edge, fit: "inside", withoutEnlargement: true,
    }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    return { image: { bytes: Uint8Array.from(data), type: "image/webp" }, width: info.width, height: info.height };
  });
}

export async function boundedImageBytes(response: Request | Response, limit = maxBytes) {
  if (Number(response.headers.get("content-length")) > limit || !response.body) {
    throw new Error("Invalid image size");
  }
  const reader = response.body.getReader();
  const buffer = new Uint8Array(limit);
  let offset = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      if (offset + part.value.length > limit) {
        void reader.cancel().catch(() => {});
        throw new Error("Invalid image size");
      }
      buffer.set(part.value, offset);
      offset += part.value.length;
    }
    return buffer.slice(0, offset);
  } finally {
    reader.releaseLock();
  }
}
