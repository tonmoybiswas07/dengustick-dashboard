"use client";

import { useEffect, useState } from "react";

import {
  ScanEye,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import ReviewStats from "./ReviewStats";
import ReviewCard from "./ReviewCard";
import ReviewDialog from "./ReviewDialog";

import type {
  ReviewInspection,
  ReviewStatistics,
} from "@/app/types/review";

export default function ReviewManager({ predictionEnabled }: { predictionEnabled: boolean }) {
  const [inspections, setInspections] =
    useState<ReviewInspection[]>([]);

  const [stats, setStats] = useState<ReviewStatistics>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  });

  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] =
    useState<ReviewInspection | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchReviews() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          status,
          page: String(page),
        });

        const response = await fetch(
          `/api/ai-review?${params}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to fetch reviews"
          );
        }

        if (controller.signal.aborted) return;

        setInspections(result.data);
        setStats(result.stats);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch reviews"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchReviews();

    return () => controller.abort();
  }, [status, page, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <ScanEye className="size-7 text-primary" />
            AI Review
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Review AI predictions and verify mosquito larvae
            detection results.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={loading}
          onClick={refreshData}
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      {!error && <ReviewStats stats={stats} />}

      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      >
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>

          <TabsTrigger value="verified">
            Verified ({stats.verified})
          </TabsTrigger>

          <TabsTrigger value="rejected">
            Rejected ({stats.rejected})
          </TabsTrigger>

          <TabsTrigger value="all">
            All Inspections
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
      ) : inspections.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6">
          <ClipboardCheck className="size-12 text-muted-foreground" />

          <h3 className="font-semibold">
            No inspections available
          </h3>

          <p className="text-sm text-muted-foreground">
            There are no inspections in this review category.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {inspections.map((inspection) => (
              <ReviewCard
                key={inspection._id}
                inspection={inspection}
                onReview={setSelected}
              />
            ))}
          </div>

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
              Page {page} of {Math.max(1, totalPages)}
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

      {selected && (
        <ReviewDialog
          predictionEnabled={predictionEnabled}
          key={selected._id}
          inspection={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onSuccess={() => {
            if (
              status === "pending" &&
              inspections.length === 1 &&
              page > 1
            ) {
              setPage((previous) => previous - 1);
            }

            refreshData();
          }}
        />
      )}
    </div>
  );
}