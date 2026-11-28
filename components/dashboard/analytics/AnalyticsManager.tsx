"use client";

import { useEffect, useState } from "react";

import {
  ChartNoAxesCombined,
  RefreshCw,
  Loader2,
  ChartNoAxesColumn,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import AnalyticsStats from "./AnalyticsStats";
import AnalyticsFilters from "./AnalyticsFilters";
import InspectionTrendChart from "./InspectionTrendChart";
import DetectionDistributionChart from "./DetectionDistributionChart";
import DistrictChart from "./DistrictChart";
import BreedingSiteChart from "./BreedingSiteChart";
import WorkerPerformanceTable from "./WorkerPerformanceTable";

import type { AnalyticsData } from "@/app/types/analytics";

export default function AnalyticsManager({
  role,
}: {
  role: string;
}) {
  const [data, setData] =
    useState<AnalyticsData | null>(null);

  const [range, setRange] = useState("30");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [district, setDistrict] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          range,
          district,
        });

        if (start && end) { params.set("start", start); params.set("end", end); }
        const response = await fetch(
          `/api/analytics?${params}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to fetch analytics"
          );
        }

        if (!controller.signal.aborted) {
          setData(result.data);
        }
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

    void fetchAnalytics();

    return () => controller.abort();
  }, [range, district, start, end, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  function resetFilters() {
    setRange("30");
    setStart(""); setEnd("");
    setDistrict("all");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <ChartNoAxesCombined className="size-7 text-primary" />

            Surveillance Analytics
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Analyze mosquito larvae surveillance, inspection
            trends and field activity.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh Data
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <label>From <input className="block rounded border bg-background p-2" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label>Through <input className="block rounded border bg-background p-2" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          </div>
          <AnalyticsFilters
            range={range}
            district={district}
            districts={
              data?.availableDistricts ?? []
            }
            onRangeChange={setRange}
            onDistrictChange={setDistrict}
            onReset={resetFilters}
          />
        </CardContent>
      </Card>

      {!loading && !error && data?.previousPeriod && <div className="rounded-md border p-4 text-sm">
        <p className="font-medium">Previous-period comparison</p>
        <p>Inspections {data.summary.totalInspections} current · {data.previousPeriod.total} previous</p>
        <p>Verified positive {data.summary.positiveDetections} current · {data.previousPeriod.verifiedPositive} previous</p>
      </div>}
      {loading ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border bg-card">
          <Loader2 className="size-8 animate-spin text-primary" />

          <p className="text-sm text-muted-foreground">
            Loading surveillance analytics...
          </p>
        </div>
      ) : error ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border bg-card">
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
          <AnalyticsStats summary={data.summary} />

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />

            <div>
              <p className="text-sm font-medium">
                Surveillance Data Interpretation
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Positive detection statistics are based on
                manually verified inspection results. They do
                not represent dengue infection rates or
                confirmed human disease cases.
              </p>
            </div>
          </div>

          {data.summary.totalInspections === 0 ? (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-6">
                <ChartNoAxesColumn className="size-12 text-muted-foreground" />

                <h3 className="font-semibold">
                  No Analytics Data
                </h3>

                <p className="text-center text-sm text-muted-foreground">
                  No inspections match the selected filters.
                </p>

                <Button
                  variant="outline"
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-3">
                <div className="min-w-0 xl:col-span-2">
                  <InspectionTrendChart
                    data={data.trends}
                  />
                </div>

                <div className="min-w-0">
                  <DetectionDistributionChart
                    data={data.detectionDistribution}
                  />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="min-w-0">
                  <DistrictChart
                    data={data.districts}
                  />
                </div>

                <div className="min-w-0">
                  <BreedingSiteChart
                    data={data.breedingSites}
                  />
                </div>
              </div>

              {role !== "researcher" && (
                <WorkerPerformanceTable
                  workers={data.workers}
                />
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}