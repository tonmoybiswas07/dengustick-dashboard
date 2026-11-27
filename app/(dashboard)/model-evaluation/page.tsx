import { requirePermission } from "@/lib/session";

import ModelEvaluationManager from "@/components/dashboard/model-evaluation/ModelEvaluationManager";

export default async function ModelEvaluationPage() {
  await requirePermission("models:evaluate");

  return <ModelEvaluationManager />;
}