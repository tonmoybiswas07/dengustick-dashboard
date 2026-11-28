import { workerAuthorized } from "@/lib/worker-auth";
import { runScheduledReport } from "@/lib/report-schedules";

export const maxDuration = 100;

export async function POST(request: Request) {
  if (!workerAuthorized(request, process.env.REPORT_WORKER_SECRET)) return new Response(null, { status: 404 });
  try {
    return Response.json({ result: await runScheduledReport() });
  } catch {
    return Response.json({ message: "Scheduled report worker unavailable" }, { status: 503 });
  }
}
