import type {
  ConfusionMatrixData,
  EvaluationMetrics,
} from "@/app/types/model-evaluation";

export function calculatePercentage(
  numerator: number,
  denominator: number
): number | null {
  if (denominator === 0) return null;

  return Number(
    ((numerator / denominator) * 100).toFixed(2)
  );
}

export function calculateMetrics(
  matrix: ConfusionMatrixData
): EvaluationMetrics {
  const { tp, tn, fp, fn } = matrix;

  const total = tp + tn + fp + fn;

  return {
    accuracy: calculatePercentage(
      tp + tn,
      total
    ),

    precision: calculatePercentage(
      tp,
      tp + fp
    ),

    recall: calculatePercentage(
      tp,
      tp + fn
    ),

    f1Score: calculatePercentage(
      2 * tp,
      2 * tp + fp + fn
    ),

    specificity: calculatePercentage(
      tn,
      tn + fp
    ),
  };
}