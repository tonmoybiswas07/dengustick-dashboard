import { Target, Crosshair, ScanSearch, Activity } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { EvaluationMetrics } from "@/app/types/model-evaluation";

export default function EvaluationStats({
  metrics,
}: {
  metrics: EvaluationMetrics;
}) {
  const cards = [
    {
      title: "Accuracy",
      value: metrics.accuracy,
      description: "Overall prediction accuracy",
      icon: Target,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "Precision",
      value: metrics.precision,
      description: "Correct positive predictions",
      icon: Crosshair,
      color: "text-blue-600",
      background: "bg-blue-500/10",
    },
    {
      title: "Recall",
      value: metrics.recall,
      description: "Positive cases detected",
      icon: ScanSearch,
      color: "text-violet-600",
      background: "bg-violet-500/10",
    },
    {
      title: "F1 Score",
      value: metrics.f1Score,
      description: "Precision and recall balance",
      icon: Activity,
      color: "text-amber-600",
      background: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-11 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
              </div>

              <h3 className="mt-4 text-3xl font-bold">
                {card.value === null ? "N/A" : `${card.value.toFixed(2)}%`}
              </h3>

              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${card.value ?? 0}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
