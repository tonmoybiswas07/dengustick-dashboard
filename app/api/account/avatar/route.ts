import { connection } from "next/server";
import { Binary } from "mongodb";
import client from "@/lib/db";
import { audit } from "@/lib/audit";
import { authorizeAPI } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { boundedImageBytes, normalizeInspectionImage, type ImageMime } from "@/lib/image-intake";
import { profileAvatars } from "@/lib/profile-avatar";

const limit = 512 * 1024;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  await connection();
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const avatar = await profileAvatars.findOne({ _id: session.user.id });
    if (!avatar) return new Response(null, { status: 404 });
    return new Response(Uint8Array.from(avatar.image.buffer), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store" },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mutate(request: Request, removing: boolean) {
  try {
    const { session, error } = await authorizeAPI("dashboard:view", request);
    if (error) return error;
    const owner = session.user.id;
    const limited = await rateLimit("profile-avatar", owner, 12, 300);
    if (limited) return limited;
    const mime = request.headers.get("content-type");
    if (!removing && (!mime || !imageTypes.has(mime))) {
      return Response.json({ message: "Choose a JPEG, PNG, or WebP image." }, { status: 415 });
    }
    const bytes = removing ? null : await boundedImageBytes(request, limit).catch(() => null);
    if (!removing && !bytes) return Response.json({ message: "Avatar exceeds the upload limit or could not be read." }, { status: 413 });
    const image = bytes ? await normalizeInspectionImage({ bytes, type: mime as ImageMime }, 320).catch(() => null) : null;
    if (!removing && !image) return Response.json({ message: "Avatar is invalid." }, { status: 415 });
    await client.withSession((dbSession) => dbSession.withTransaction(async () => {
      if (image) await profileAvatars.updateOne({ _id: owner }, { $set: { image: new Binary(image.bytes) } }, { upsert: true, session: dbSession });
      else await profileAvatars.deleteOne({ _id: owner }, { session: dbSession });
      await audit({ actorId: owner, action: image ? "profile.avatar.update" : "profile.avatar.remove",
        resource: "user", resourceId: owner }, dbSession);
    }));
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ message: "Could not update the avatar." }, { status: 503 });
  }
}

export async function POST(request: Request) { return mutate(request, false); }
export async function DELETE(request: Request) { return mutate(request, true); }
