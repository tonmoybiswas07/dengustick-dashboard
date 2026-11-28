import client from "@/lib/db";
import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getImageStorage } from "@/lib/cloudinary-images";
import { normalizeInspectionImage, type ImageMime } from "@/lib/image-intake";
import { inspectionImages } from "@/lib/inspection-images";
import { maxInspectionImageBytes } from "@/lib/inspection-image-reference.mjs";
import { hasActiveRegion } from "@/lib/region-security";
import { isTrustedRequest } from "@/lib/request-security";
import { audit } from "@/lib/audit";
import { connection } from "next/server";

const extensions: Readonly<Record<string, ImageMime | undefined>> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};

export async function GET(request: Request) {
  await connection();
  const { error } = await authorizeAPI("inspections:create", request);
  return error ?? Response.json({ enabled: !!getImageStorage() });
}

export async function POST(request: Request) {
  try {
    if (!isTrustedRequest(request)) return Response.json({ message: "Invalid request origin" }, { status: 403 });
    const { session, error } = await authorizeAPI("inspections:create");
    if (error) return error;
    const limited = await rateLimit("inspection-image-upload", session.user.id, 40, 60);
    if (limited) return limited;
    const storage = getImageStorage();
    if (!storage) return Response.json({ message: "Image storage is unavailable" }, { status: 503 });

    const regionId = new URL(request.url).searchParams.get("region") ?? "";
    if (!ObjectId.isValid(regionId) ||
      (session.user.role !== "admin" && session.user.regionId !== regionId) ||
      !(await hasActiveRegion({ regionId }))) {
      return Response.json({ message: "Select an authorized active region" }, { status: 403 });
    }
    const type = extensions[request.headers.get("x-image-extension") ?? ""];
    if (typeof type !== "string" || request.headers.get("content-type") !== type) {
      return Response.json({ message: "Select a JPEG, PNG, or WebP image" }, { status: 415 });
    }
    if (Number(request.headers.get("content-length")) > maxInspectionImageBytes) {
      return Response.json({ message: "Image exceeds 4 MiB" }, { status: 413 });
    }
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ message: "Image is required" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > maxInspectionImageBytes) {
          void reader.cancel().catch(() => { });
          return Response.json({ message: "Image exceeds 4 MiB" }, { status: 413 });
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const image = await normalizeInspectionImage({ bytes, type }).catch(() => null);
    if (!image) return Response.json({ message: "Invalid or unsupported image content" }, { status: 415 });

    const _id = new ObjectId();
    const publicId = `denguestick/inspections/${_id.toHexString()}`;
    const createdAt = new Date();
    await inspectionImages.insertOne({
      _id, publicId, ownerId: session.user.id, regionId, status: "uploading",
      bytes: image.bytes.length, createdAt, expiresAt: new Date(createdAt.getTime() + 30 * 60_000),
    });
    const stored = await storage.put(publicId, image);
    await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      const completed = await inspectionImages.updateOne({ _id, status: "uploading" }, {
        $set: { ...stored, status: "ready", expiresAt: new Date(Date.now() + 24 * 60 * 60_000) },
      }, { session: dbSession });
      if (!completed.matchedCount) throw new Error("Image upload expired");
      await audit({
        actorId: session.user.id, action: "image.upload", resource: "inspection_image",
        resourceId: _id.toHexString(), regionId,
      }, dbSession);
    }));
    return Response.json({ url: `/api/inspection-images/${_id.toHexString()}` }, { status: 201 });
  } catch {
    return Response.json({ message: "Image upload failed. Try again." }, { status: 502 });
  }
}
