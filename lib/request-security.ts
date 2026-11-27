import "server-only";

export function isTrustedRequest(request: Request) {
  const expected = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  const origin = request.headers.get("origin");
  return request.headers.get("sec-fetch-site") !== "cross-site" &&
    (origin === null || origin === expected);
}

const maxBodyBytes = 64 * 1024;

export class RequestBodyTooLarge extends Error {
  response() {
    return Response.json({ message: "Request body exceeds 64 KiB" }, { status: 413 });
  }
}

export async function readJSON(request: Request | Response): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBodyBytes) throw new RequestBodyTooLarge();
  const isJSON = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let content = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        throw new RequestBodyTooLarge();
      }
      if (isJSON) content += decoder.decode(chunk.value, { stream: true });
    }
    return isJSON ? JSON.parse(content + decoder.decode()) : null;
  } catch (error) {
    if (error instanceof RequestBodyTooLarge) throw error;
    return null;
  } finally {
    reader.releaseLock();
  }
}
