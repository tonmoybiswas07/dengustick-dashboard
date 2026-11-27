import { connection } from "next/server";
import { authorizeAdmin } from "@/lib/admin-access";
import { queryAudit } from "@/lib/audit-query";

export async function GET(request: Request) {
  await connection();

  try {
    const { error } = await authorizeAdmin(request);
    if (error) return error;
    const data = await queryAudit(Object.fromEntries(new URL(request.url).searchParams));
    return data ? Response.json(data) : Response.json({ message: "Invalid audit filters" }, { status: 400 });
  } catch {
    return Response.json({ message: "Unable to load audit log" }, { status: 500 });
  }
}
