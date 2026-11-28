import { ObjectId } from "mongodb";
import { authorizeAPI } from "@/lib/api-auth";
import { inspectionsCollection } from "@/lib/collections";
import { getInspectionFilter } from "@/lib/inspection-access";
import { getInferenceService } from "@/lib/inference";
import { boundedImageBytes, normalizeInspectionImage, type ImageMime } from "@/lib/image-intake";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await authorizeAPI("inspections:view", request);
    if (error) return error;
    const { id } = await context.params;
    const scope = getInspectionFilter(session.user);
    if (!scope || !ObjectId.isValid(id)) return new Response(null, { status: 404 });
    const record = await inspectionsCollection.findOne({ ...scope, _id: new ObjectId(id) }, { projection: { prediction: 1 } });
    if (!record?.prediction?.annotatedImageId) return new Response(null, { status: 404 });
    const upstream = await getInferenceService()?.annotation(record.prediction.annotatedImageId);
    const mime = upstream?.headers.get("content-type");
    if (!upstream || !mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return new Response(null, { status: 404 });
    const image = await normalizeInspectionImage({ bytes: await boundedImageBytes(upstream), type: mime as ImageMime });
    return new Response(image.bytes, { headers: { "Content-Type": image.type, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response(null, { status: 502 });
  }
}
