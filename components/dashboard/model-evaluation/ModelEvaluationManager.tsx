"use client";

import { ContentSkeleton } from "@/components/dashboard/ContentSkeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";

import { useEffect, useState } from "react";

import {
  BrainCircuit,
  RefreshCw,
  Info,
  Database,
  CircleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import EvaluationStats from "./EvaluationStats";
import EvaluationFilters from "./EvaluationFilters";
import ConfusionMatrix from "./ConfusionMatrix";
import ConfidenceChart from "./ConfidenceChart";
import PredictionComparison from "./PredictionComparison";
import EvaluationSummary from "./EvaluationSummary";

import type {
  ModelEvaluationData,
} from "@/app/types/model-evaluation";

export default function ModelEvaluationManager() {
  const [data, setData] =
    useState<ModelEvaluationData | null>(null);

  const [range, setRange] = useState("30");

  const [version, setVersion] = useState("");
  const [district, setDistrict] = useState("all");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvaluation() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          range,
          district,
        });

        if (version) params.set("version", version);
        const response = await fetch(
          `/api/model-evaluation?${params}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ??
              "Failed to load evaluation data"
          );
        }

        if (controller.signal.aborted) return;

        setData(result.data);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchEvaluation();

    return () => controller.abort();
  }, [range, district, version, refreshKey]);

  function refreshData() {
    setRefreshKey(
      (previous) => previous + 1
    );
  }

  function resetFilters() {
    setRange("30");
    setDistrict("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title="AI Model Evaluation" icon={<BrainCircuit />}
          description="Monitor mosquito larvae detection performance against manually verified results." />

        <Button
          variant="outline"
          disabled={loading}
          onClick={refreshData}
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "motion-safe:animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      <label className="block text-sm">Model version
        <select className="ml-2 rounded border bg-background p-2" value={version} onChange={(event) => setVersion(event.target.value)}>
          <option value="">All versions</option>
          {data?.versions.map((row) => <option key={row.version}>{row.version}</option>)}
        </select>
      </label>
      {!loading && !error && data && <section className="space-y-2 rounded-md border p-4 text-sm">
        <h2 className="font-semibold">Model version comparison</h2>
        {data.versions.length > 0 ? <ul>{data.versions.map((row) => <li key={row.version}>
          {row.version} · {row.eligible} eligible · {row.accuracy ?? "N/A"}{row.accuracy !== null && "%"} accuracy
        </li>)}</ul> : <p>No eligible versioned predictions.</p>}
        <p>Larvae count error {data.countErrors
          ? `MAE ${data.countErrors.mae.toFixed(2)} · RMSE ${data.countErrors.rmse.toFixed(2)} · ${data.countErrors.samples} paired counts`
          : "N/A (no paired prediction and reference counts)"}</p>
      </section>}
      <EvaluationFilters
        range={range}
        district={district}
        districts={data?.availableDistricts ?? []}
        onRangeChange={setRange}
        onDistrictChange={setDistrict}
        onReset={resetFilters}
      />

      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-primary" />

        <div>
          <p className="text-sm font-medium">
            Evaluation Methodology
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Metrics compare recorded AI predictions with
            manual verification. Only verified binary
            predictions with valid confidence scores are
            included. These metrics do not represent
            confirmed human dengue risk.
          </p>
        </div>
      </div>

      {loading ? (
        <ContentSkeleton label="Loading model evaluation…" className="min-h-[400px]" />
      ) : error ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border bg-card">
          <CircleAlert className="size-10 text-destructive" />

          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button
            variant="outline"
            onClick={refreshData}
          >
            Try Again
          </Button>
        </div>
      ) : data ? (
        <>
          <EvaluationStats metrics={data.metrics} />

          {data.summary.evaluatedInspections === 0 ? (
            <>
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Database className="size-8 text-primary" />
                  </div>

                  <h2 className="text-xl font-semibold">
                    No Evaluation Data Available
                  </h2>

                  <p className="max-w-md text-sm text-muted-foreground">
                    Model performance will appear once
                    eligible AI predictions have been
                    manually verified within the selected
                    date range and district.
                  </p>

                  <Button
                    variant="outline"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>

              <EvaluationSummary
                summary={data.summary}
              />
            </>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <ConfusionMatrix
                  matrix={data.confusionMatrix}
                />

                <EvaluationSummary
                  summary={data.summary}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <ConfidenceChart
                  data={data.confidenceDistribution}
                />

                <PredictionComparison
                  data={data.predictionComparison}
                />
              </div>

              <Card>
                <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium">
                      Model Specificity
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Percentage of manually verified
                      negative cases correctly classified.
                    </p>
                  </div>

                  <p className="text-3xl font-bold text-primary">
                    {data.metrics.specificity === null
                      ? "N/A"
                      : `${data.metrics.specificity.toFixed(2)}%`}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}