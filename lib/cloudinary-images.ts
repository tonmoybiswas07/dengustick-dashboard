import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { InspectionImageStorage } from "@/lib/image-intake";

const cloudinaryReply = z.object({
  public_id: z.string(),
  type: z.literal("authenticated"),
  version: z.number().int().positive(),
  format: z.literal("webp"),
});

export function getImageStorage(): InspectionImageStorage | null {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret || !/^[\w-]+$/.test(cloud)) return null;
  const apiKey = key;
  const api = `https://api.cloudinary.com/v1_1/${cloud}/image`;

  function signedFields(params: Record<string, string>) {
    const values = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
    const serialized = Object.entries(values).sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => `${name}=${value}`).join("&");
    return new URLSearchParams({
      ...values, api_key: apiKey,
      signature: createHash("sha256").update(serialized + secret).digest("hex"),
    });
  }

  return {
    async put(publicId, image) {
      const form = new FormData();
      for (const [name, value] of signedFields({ overwrite: "false", public_id: publicId, type: "authenticated" })) {
        form.set(name, value);
      }
      form.set("file", new Blob([image.bytes], { type: image.type }), "inspection.webp");
      const response = await fetch(`${api}/upload`, {
        method: "POST", body: form, redirect: "error", signal: AbortSignal.timeout(20_000), cache: "no-store",
      });
      if (!response.ok) throw new Error("Image storage upload failed");
      const data = cloudinaryReply.parse(await response.json());
      if (data.public_id !== publicId) throw new Error("Image storage returned an unexpected identifier");
      return { version: data.version };
    },
    async get(publicId, version) {
      if (!/^denguestick\/inspections\/[a-f0-9]{24}$/.test(publicId) || !Number.isSafeInteger(version) || version < 1) {
        throw new Error("Invalid stored image reference");
      }
      const path = `v${version}/${publicId}.webp`;
      const signature = createHash("sha256").update(path + secret).digest("base64url").slice(0, 8);
      const response = await fetch(`https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${path}`, {
        redirect: "error", signal: AbortSignal.timeout(15_000), cache: "no-store",
      });
      if (!response.ok || response.headers.get("content-type") !== "image/webp") throw new Error("Image storage read failed");
      return response;
    },
    async remove(publicId) {
      const response = await fetch(`${api}/destroy`, {
        method: "POST", body: signedFields({ public_id: publicId, type: "authenticated", invalidate: "true" }),
        redirect: "error", signal: AbortSignal.timeout(10_000), cache: "no-store",
      });
      const result = z.object({ result: z.enum(["ok", "not found"]) }).safeParse(await response.json());
      if (!response.ok || !result.success) throw new Error("Image storage deletion failed");
    },
  };
}
