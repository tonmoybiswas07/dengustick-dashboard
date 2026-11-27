import {
  ClipboardList,
  ShieldCheck,
  BrainCircuit,
  CircleMinus,
  Gauge,
  ChartPie,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type {
  EvaluationSummaryData,
} from "@/app/types/model-evaluation";

export default function EvaluationSummary({
  summary,
}: {
  summary: EvaluationSummaryData;
}) {
  const items = [
    {
      label: "Total Inspections",
      value: summary.totalInspections,
      icon: ClipboardList,
      color: "text-blue-600",
    },
    {
      label: "Verified Inspections",
      value: summary.verifiedInspections,
      icon: ShieldCheck,
      color: "text-emerald-600",
    },
    {
      label: "Evaluated Predictions",
      value: summary.evaluatedInspections,
      icon: BrainCircuit,
      color: "text-teal-600",
    },
    {
      label: "Excluded Verified Records",
      value: summary.excludedInspections,
      icon: CircleMinus,
      color: "text-amber-600",
    },
    {
      label: "Average AI Confidence",
      value:
        summary.averageConfidence === null
          ? "N/A"
          : `${summary.averageConfidence.toFixed(2)}%`,
      icon: Gauge,
      color: "text-violet-600",
    },
    {
      label: "Evaluation Coverage",
      value:
        summary.coverage === null
          ? "N/A"
          : `${summary.coverage.toFixed(2)}%`,
      icon: ChartPie,
      color: "text-indigo-600",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Summary</CardTitle>

        <CardDescription>
          Dataset coverage and evaluation information.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon
                    className={`size-5 ${item.color}`}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  {item.label}
                </p>
              </div>

              <span className="text-lg font-semibold">
                {item.value}
              </span>
            </div>
          );
        })}

        <div className="space-y-2 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span>Evaluation Coverage</span>

            <span className="font-medium">
              {summary.coverage === null
                ? "N/A"
                : `${summary.coverage}%`}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${summary.coverage ?? 0}%`,
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Eligible predictions as a percentage of all verified inspections.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}