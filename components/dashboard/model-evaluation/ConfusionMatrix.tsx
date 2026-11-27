import { Grid2X2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import type { ConfusionMatrixData } from "@/app/types/model-evaluation";

export default function ConfusionMatrix({
  matrix,
}: {
  matrix: ConfusionMatrixData;
}) {
  const cells = [
    {
      label: "True Positive",
      short: "TP",
      value: matrix.tp,
      style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "False Negative",
      short: "FN",
      value: matrix.fn,
      style: "border-red-500/30 bg-red-500/10 text-red-600",
    },
    {
      label: "False Positive",
      short: "FP",
      value: matrix.fp,
      style: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    },
    {
      label: "True Negative",
      short: "TN",
      value: matrix.tn,
      style: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    },
  ];

  const total = matrix.tp + matrix.tn + matrix.fp + matrix.fn;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid2X2 className="size-5 text-primary" />
          Confusion Matrix
        </CardTitle>

        <CardDescription>
          AI predictions compared with manual verification.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-3 text-center text-sm font-semibold">
          AI Prediction
        </div>

        <div className="grid grid-cols-[64px_repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[90px_repeat(2,minmax(0,1fr))] sm:gap-3">
          <div />

          <p className="text-center text-xs font-medium text-muted-foreground">
            Positive
          </p>

          <p className="text-center text-xs font-medium text-muted-foreground">
            Negative
          </p>

          <div className="flex items-center justify-center text-xs text-muted-foreground">
            Actual Positive
          </div>

          {cells.slice(0, 2).map((cell) => (
            <div
              key={cell.short}
              className={`flex min-h-32 flex-col items-center justify-center rounded-xl border p-3 ${cell.style}`}
            >
              <span className="text-xs font-semibold">{cell.short}</span>

              <span className="my-2 text-3xl font-bold">{cell.value}</span>

              <span className="text-center text-xs">{cell.label}</span>
            </div>
          ))}

          <div className="flex items-center justify-center text-xs text-muted-foreground">
            Actual Negative
          </div>

          {cells.slice(2).map((cell) => (
            <div
              key={cell.short}
              className={`flex min-h-32 flex-col items-center justify-center rounded-xl border p-3 ${cell.style}`}
            >
              <span className="text-xs font-semibold">{cell.short}</span>

              <span className="my-2 text-3xl font-bold">{cell.value}</span>

              <span className="text-center text-xs">{cell.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5">
          <div>
            <p className="text-xs text-muted-foreground">Correct Predictions</p>

            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {matrix.tp + matrix.tn}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Incorrect Predictions
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              {matrix.fp + matrix.fn}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Total evaluated predictions: {total}
        </p>
      </CardContent>
    </Card>
  );
}
