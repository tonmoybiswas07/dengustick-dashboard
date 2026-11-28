"use client";

import { ContentSkeleton } from "@/components/dashboard/ContentSkeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";

import { useEffect, useState } from "react";

import {
  BellRing,
  BellOff,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { hasPermission } from "@/lib/permissions";
import { alertSeverities } from "@/app/constants/alert";

import AlertStats from "./AlertStats";
import AlertCard from "./AlertCard";

import type {
  AlertDTO,
  AlertStatistics,
} from "@/app/types/alert";

export default function AlertManager({
  role,
}: {
  role: string;
}) {
  const canManage = hasPermission(
    role,
    "alerts:manage"
  );

  const [alerts, setAlerts] = useState<AlertDTO[]>([]);

  const [stats, setStats] = useState<AlertStatistics>({
    total: 0,
    unread: 0,
    active: 0,
    highPriority: 0,
    resolved: 0,
  });

  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] =
    useState<AlertDTO | null>(null);

  const [resolutionNotes, setResolutionNotes] =
    useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAlerts() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          status,
          severity,
          page: String(page),
        });

        const response = await fetch(
          `/api/alerts?${params}`,
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

        setAlerts(result.data);
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
            : "Failed to load alerts"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchAlerts();

    return () => controller.abort();
  }, [status, severity, page, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);

    window.dispatchEvent(
      new Event("alerts-updated")
    );
  }

  async function handleSync() {
    try {
      setSyncing(true);

      const response = await fetch(
        "/api/alerts/sync",
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);

      setPage(1);
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sync alerts"
      );
    } finally {
      setSyncing(false);
    }
  }

  async function updateAlert(
    id: string,
    action: "read" | "resolve"
  ) {
    if (
      action === "resolve" &&
      resolutionNotes.trim().length < 5
    ) {
      toast.error("Please provide resolution notes");
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(
        `/api/alerts/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            action,

            ...(action === "resolve"
              ? { resolutionNotes }
              : {}),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);

      setSelected(null);
      setResolutionNotes("");

      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update alert"
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title="Alerts Management" icon={<BellRing />}
          description="Monitor surveillance alerts and field operation issues." />

        <div className="flex flex-wrap gap-2">
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

          {canManage && (
            <Button
              disabled={syncing}
              onClick={handleSync}
            >
              {syncing ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                <BellRing className="size-4" />
              )}

              Sync Alerts
            </Button>
          )}
        </div>
      </div>

      {!error && <AlertStats stats={stats} />}

      <div className="flex flex-col justify-between gap-3 lg:flex-row">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all");
            setPage(1);
          }}
        >
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">
              All Alerts
            </TabsTrigger>

            <TabsTrigger value="unread">
              Unread ({stats.unread})
            </TabsTrigger>

            <TabsTrigger value="active">
              Active ({stats.active})
            </TabsTrigger>

            <TabsTrigger value="resolved">
              Resolved
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={severity}
          onValueChange={(value) => {
            setSeverity(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Alert severity" className="w-full lg:w-48">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All Severity
            </SelectItem>

            {alertSeverities.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ContentSkeleton label="Loading alerts…" className="min-h-64" />
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
      ) : alerts.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border bg-card p-6">
          <BellOff className="size-12 text-muted-foreground" />

          <h3 className="font-semibold">
            No alerts found
          </h3>

          <p className="text-center text-sm text-muted-foreground">
            There are no alerts matching your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert._id}
                alert={alert}
                canManage={canManage}
                updating={updating}
                canViewSource={hasPermission(
                  role,
                  alert.sourceType === "inspection"
                    ? "inspections:view"
                    : "operations:manage"
                )}
                onRead={(id) =>
                  updateAlert(id, "read")
                }
                onResolve={(item) => {
                  setSelected(item);
                  setResolutionNotes("");
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
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
              aria-label="Next page"
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !updating) {
            setSelected(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>

            <DialogDescription>
              {selected?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="resolutionNotes">
              Resolution Notes
            </Label>

            <Textarea
              id="resolutionNotes"
              value={resolutionNotes}
              onChange={(e) =>
                setResolutionNotes(e.target.value)
              }
              placeholder="Describe the action taken to resolve this alert..."
              rows={4}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>

            <Button
              disabled={updating}
              onClick={() => {
                if (selected) {
                  void updateAlert(
                    selected._id,
                    "resolve"
                  );
                }
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {updating ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                <CircleCheck className="size-4" />
              )}

              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}