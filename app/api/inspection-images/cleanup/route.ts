import { authorizeAdmin } from "@/lib/admin-access";
import { getImageStorage } from "@/lib/cloudinary-images";
import { removeExpiredImages } from "@/lib/inspection-images";

export async function POST(request: Request) {
  try {
    const { error } = await authorizeAdmin(request);
    if (error) return error;
    const storage = getImageStorage();
    if (!storage) return Response.json({ message: "Image storage is unavailable" }, { status: 503 });
    return Response.json(await removeExpiredImages(storage));
  } catch {
    return Response.json({ message: "Image cleanup failed" }, { status: 502 });
  }
}
