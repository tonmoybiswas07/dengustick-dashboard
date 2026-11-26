import { requirePermission } from "@/lib/session";
import ReviewManager from "@/components/dashboard/ai-review/ReviewManager";

export default async function AIReviewPage() {
  await requirePermission("ai:review");

  return <ReviewManager />;
}