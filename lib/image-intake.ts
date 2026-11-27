import "server-only";

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export type ValidatedImage = { bytes: Uint8Array<ArrayBuffer>; type: ImageMime };
const maxBytes = 5 * 1024 * 1024;
const maxPixels = 16_000_000;

type DecodeImage = (
  file: ValidatedImage,
  maxPixels: number,
) => Promise<{ image: ValidatedImage; width: number; height: number }>;

export interface InspectionImageStorage {
  put(key: string, image: ValidatedImage): Promise<void>;
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
