import { workerAuthorized } from "@/lib/worker-auth";
import { getPredictionServices, processPrediction } from "@/lib/inspection-predictions";

export const maxDuration = 100;

export async function POST(request: Request) {
  if (!workerAuthorized(request, process.env.INFERENCE_WORKER_SECRET)) {
    return new Response(null, { status: 404 });
  }
  try {
    const services = await getPredictionServices();
    if (!services) return Response.json({ message: "Prediction services are unavailable" }, { status: 503 });
    return Response.json({ result: await processPrediction(services) });
  } catch {
    return Response.json({ message: "Prediction worker unavailable" }, { status: 503 });
  }
}
