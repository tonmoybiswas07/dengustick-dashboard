"use client";

import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  CircleAlert,
  Clock3,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import StatsCards from "./StatsCards";
import InspectionChart from "./InspectionChart";
import DetectionChart from "./DetectionChart";
import RecentInspections from "./RecentInspections";
import PriorityAlerts from "./PriorityAlerts";
import DashboardFilters from "./DashboardFilters";

import type {
  DashboardData,
} from "@/app/types/dashboard";

interface OverviewManagerProps {
  userName: string;
  defaultRange: string;
  role?: string | null;
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  health_authority: "Health Authority",
  supervisor: "Supervisor",
  field_worker: "Field Worker",
  researcher: "Researcher",
};

export default function OverviewManager({
  userName,
  defaultRange,
  role,
}: OverviewManagerProps) {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [range, setRange] = useState(defaultRange);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/dashboard?range=${range}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ??
              "Failed to load dashboard"
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

    loadDashboard();

    return () => controller.abort();
  }, [range, refreshKey]);

  function refreshDashboard() {
    setLoading(true);

    setRefreshKey(
      (previous) => previous + 1
    );
  }

  function changeRange(value: string) {
    if (value === range) return;

    setLoading(true);
    setRange(value);
  }

  const firstName =
    userName.trim().split(/\s+/)[0] || "User";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <LayoutDashboard className="size-8 text-primary" />
            Surveillance Overview
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back, {firstName}. Monitor mosquito
            larvae surveillance activities.
          </p>
        </div>

        <DashboardFilters
          range={range}
          loading={loading}
          onRangeChange={changeRange}
          onRefresh={refreshDashboard}
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-7">
        <div className="absolute -right-10 -top-16 size-56 rounded-full bg-primary/5" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            DengueVision Surveillance System
          </p>

          <h2 className="mt-3 text-xl font-bold md:text-2xl">
            AI-Powered Mosquito Larvae Surveillance
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Track field inspections, manually verified
            detections and operational alerts from a
            centralized surveillance dashboard.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium">
            <span className="size-2 rounded-full bg-primary" />

            {roleLabels[role ?? ""] ?? "User"}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from(
              { length: 4 },
              (_, index) => (
                <Card key={index}>
                  <CardContent className="space-y-4 p-5">
                    <Skeleton className="h-4 w-32" />

                    <Skeleton className="h-9 w-20" />

                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              )
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Skeleton className="h-[410px] xl:col-span-2" />

            <Skeleton className="h-[410px]" />
          </div>

          <Skeleton className="h-[320px]" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex min-h-[350px] flex-col items-center justify-center gap-4 p-8 text-center">
            <CircleAlert className="size-10 text-destructive" />

            <h2 className="text-xl font-semibold">
              Unable to load dashboard
            </h2>

            <p className="text-sm text-muted-foreground">
              {error}
            </p>

            <Button onClick={refreshDashboard}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <StatsCards
            statistics={data.statistics}
            range={range}
          />

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <InspectionChart
                data={data.inspectionTrends}
              />
            </div>

            <DetectionChart
              data={data.detectionDistribution}
            />
          </div>

          {data.access.inspections && (
            <RecentInspections
              data={data.recentInspections}
            />
          )}

          {data.access.alerts && (
            <PriorityAlerts
              data={data.priorityAlerts}
            />
          )}

          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />

            <div className="space-y-1">
              <p className="text-sm font-medium">
                Surveillance Data Notice
              </p>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Detection statistics represent manually
                verified mosquito larvae observations.
                They do not establish confirmed human
                dengue risk. Worker and alert counts
                reflect current records, independent
                of the selected inspection date range.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />

            Last updated:{" "}

            {new Date(
              data.updatedAt
            ).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Dhaka",
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}