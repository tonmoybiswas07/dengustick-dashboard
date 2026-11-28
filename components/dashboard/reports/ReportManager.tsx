"use client";

import { ReportSchedules } from "./ReportSchedules";
import { useEffect, useState } from "react";

import {
  FileText,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { hasPermission } from "@/lib/permissions";

import ReportStats from "./ReportStats";
import ReportTable from "./ReportTable";
import ReportPreview from "./ReportPreview";
import GenerateReportForm from "./GenerateReportForm";

import type {
  ReportDTO,
  ReportListItem,
  ReportStatistics,
} from "@/app/types/report";

export default function ReportManager({
  role,
}: {
  role: string;
}) {
  const canCreate = hasPermission(
    role,
    "reports:create"
  );

  const canExport = hasPermission(
    role,
    "reports:export"
  );

  const [reports, setReports] = useState<
    ReportListItem[]
  >([]);

  const [districts, setDistricts] =
    useState<string[]>([]);

  const [stats, setStats] =
    useState<ReportStatistics>({
      total: 0,
      generatedByMe: 0,
      thisMonth: 0,
    });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] =
    useState<ReportDTO | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReports() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/reports?page=${page}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message);
        }

        if (controller.signal.aborted) return;

        setReports(result.data);
        setDistricts(result.districts);
        setStats(result.stats);

        const pages = Math.max(
          1,
          result.pagination.totalPages
        );

        setTotalPages(pages);

        if (page > pages) {
          setPage(pages);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch reports"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchReports();

    return () => controller.abort();
  }, [page, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  async function handlePreview(id: string) {
    const toastId = toast.loading(
      "Loading report..."
    );

    try {
      const response = await fetch(
        `/api/reports/${id}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setSelected(result.data);

      toast.dismiss(toastId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load report",
        { id: toastId }
      );
    }
  }

  async function handleDownload(
    id: string,
    format: "pdf" | "csv"
  ) {
    const toastId = toast.loading(
      `Preparing ${format.toUpperCase()}...`
    );

    try {
      const response = await fetch(
        `/api/reports/${id}?format=${format}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const result = await response
          .json()
          .catch(() => null);

        throw new Error(
          result?.message ?? "Download failed"
        );
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `denguevision-${id}.${format}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      toast.success(
        `${format.toUpperCase()} download started`,
        { id: toastId }
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Download failed",
        { id: toastId }
      );
    }
  }

  function handleReportCreated(report: ReportDTO) {
    setSelected(report);
    setPage(1);
    refreshData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <FileText className="size-7 text-primary" />

            Reports Management
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Generate, preview and export surveillance reports.
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

          Refresh
        </Button>
      </div>

      {!error && <ReportStats stats={stats} />}

      {canCreate && !error && (
        <GenerateReportForm
          role={role}
          districts={districts}
          onSuccess={handleReportCreated}
        />
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">
            Report History
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            View previously generated surveillance reports.
          </p>
        </div>

        {canCreate && <ReportSchedules />}
      {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-xl border bg-card">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card">
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
        ) : (
          <>
            <ReportTable
              reports={reports}
              canExport={canExport}
              onPreview={handlePreview}
              onDownload={handleDownload}
            />

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
              >
                <ChevronLeft className="size-4" />
              </Button>

              <span className="text-sm">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <ReportPreview
        report={selected}
        canExport={canExport}
        onClose={() => setSelected(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}