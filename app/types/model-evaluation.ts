export interface ConfusionMatrixData {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
}

export interface EvaluationMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  specificity: number | null;
}

export interface EvaluationSummaryData {
  totalInspections: number;
  verifiedInspections: number;
  evaluatedInspections: number;
  excludedInspections: number;
  correctPredictions: number;
  incorrectPredictions: number;
  averageConfidence: number | null;
  coverage: number | null;
}

export interface ConfidenceDistribution {
  range: string;
  correct: number;
  incorrect: number;
  total: number;
}

export interface PredictionComparisonData {
  name: string;
  ai: number;
  manual: number;
}

export interface ModelEvaluationData {
  versions: { version: string; eligible: number; accuracy: number | null }[];
  countErrors: { samples: number; mae: number; rmse: number } | null;
  metrics: EvaluationMetrics;
  confusionMatrix: ConfusionMatrixData;
  summary: EvaluationSummaryData;
  confidenceDistribution: ConfidenceDistribution[];
  predictionComparison: PredictionComparisonData[];
  availableDistricts: string[];
}