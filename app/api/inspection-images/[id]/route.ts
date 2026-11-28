import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { getImageStorage } from "@/lib/cloudinary-images";
import { inspectionImages } from "@/lib/inspection-images";
import { getInspectionFilter } from "@/lib/inspection-access";
import { inspectionsCollection } from "@/lib/collections";
import { connection } from "next/server";

type Context = { params: Promise<{ id: string }> };
const notFound = () => new Response(null, { status: 404 });

export async function GET(request: Request, { params }: Context) {
  await connection();
  try {
    const { session, error } = await authorizeAPI("inspections:view", request);
    if (error) return error;
    const { id } = await params;
    if (!ObjectId.isValid(id)) return notFound();
    const record = await inspectionImages.findOne({ _id: new ObjectId(id), status: "ready" });
    if (!record?.version) return notFound();
    const user = session.user;
    if (record.inspectionId) {
      const scope = getInspectionFilter(user);
      if (!scope || !(await inspectionsCollection.findOne({
        ...scope, _id: record.inspectionId, images: `/api/inspection-images/${id}`,
      }, { projection: { _id: 1 } }))) return notFound();
    } else if (record.ownerId !== user.id || (user.role !== "admin" && user.regionId !== record.regionId) ||
               !record.expiresAt || record.expiresAt <= new Date()) return notFound();

    const storage = getImageStorage();
    if (!storage) return new Response(null, { status: 503 });
    const image = await storage.get(record.publicId, record.version);
    return new Response(image.body, { headers: {
      "Content-Type": "image/webp", "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response(null, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { session, error } = await authorizeAPI("inspections:create", request);
    if (error) return error;
    const { id } = await params;
    if (!ObjectId.isValid(id)) return notFound();
    const result = await inspectionImages.updateOne({
      _id: new ObjectId(id), ownerId: session.user.id, inspectionId: { $exists: false }, status: "ready",
      ...(session.user.role !== "admin" && { regionId: session.user.regionId ?? "" }),
    }, { $set: { status: "deleting", expiresAt: new Date() } });
    return result.matchedCount ? new Response(null, { status: 204 }) : notFound();
  } catch {
    return new Response(null, { status: 500 });
  }
}
