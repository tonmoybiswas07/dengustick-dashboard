import {
  ClipboardList,
  ShieldCheck,
  ScanEye,
  Activity,
  Clock3,
  Bug,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { AnalyticsSummary } from "@/app/types/analytics";

export default function AnalyticsStats({
  summary,
}: {
  summary: AnalyticsSummary;
}) {
  const cards = [
    {
      title: "Total Inspections",
      value: summary.totalInspections,
      icon: ClipboardList,
      color: "text-teal-600",
      background: "bg-teal-500/10",
      description: "Recorded surveillance inspections",
    },
    {
      title: "Verified Inspections",
      value: summary.verifiedInspections,
      icon: ShieldCheck,
      color: "text-emerald-600",
      background: "bg-emerald-500/10",
      description: "Manually verified records",
    },
    {
      title: "Positive Detections",
      value: summary.positiveDetections,
      icon: ScanEye,
      color: "text-red-600",
      background: "bg-red-500/10",
      description: "Verified positive inspections",
    },
    {
      title: "Positive Rate",
      value:
        summary.positiveRate === null
          ? "N/A"
          : `${summary.positiveRate}%`,
      icon: Activity,
      color: "text-blue-600",
      background: "bg-blue-500/10",
      description: "Among conclusive verified results",
    },
    {
      title: "Pending Review",
      value: summary.pendingInspections,
      icon: Clock3,
      color: "text-amber-600",
      background: "bg-amber-500/10",
      description: "Awaiting manual verification",
    },
    {
      title: "Recorded Larvae",
      value: summary.totalLarvae,
      icon: Bug,
      color: "text-violet-600",
      background: "bg-violet-500/10",
      description: "Sum of available verified counts",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
              </div>

              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                {typeof card.value === "number"
                  ? card.value.toLocaleString()
                  : card.value}
              </h3>

              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}