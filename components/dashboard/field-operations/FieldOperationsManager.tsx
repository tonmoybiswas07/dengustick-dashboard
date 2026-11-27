"use client";

import { loadDirectory } from "@/lib/directory";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  Plus,
  Loader2,
  RefreshCw,
  UsersRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
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
import { taskStatuses } from "@/app/constants/field-operation";

import OperationStats from "./OperationStats";
import TaskTable from "./TaskTable";
import AssignTaskDialog from "./AssignTaskDialog";

import type {
  FieldTaskDTO,
  FieldWorker,
  OperationStatistics,
  TaskStatus,
} from "@/app/types/field-operation";

export default function FieldOperationsManager({
  role,
}: {
  role: string;
}) {
  const canManage = hasPermission(
    role,
    "operations:manage"
  );

  const canUpdate = hasPermission(role, "operations:update");

  const [tasks, setTasks] = useState<FieldTaskDTO[]>([]);
  const [workers, setWorkers] = useState<FieldWorker[]>([]);

  const [stats, setStats] = useState<OperationStatistics>({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);

  const [selectedTask, setSelectedTask] =
    useState<FieldTaskDTO | null>(null);

  const [nextStatus, setNextStatus] =
    useState<TaskStatus>("in_progress");

  const [inspectionId, setInspectionId] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/field-operations/tasks?status=${status}&page=${page}`,
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

        setTasks(result.data);
        setStats(result.stats);
        setTotalPages(result.pagination.totalPages);

        if (canManage) {
          const workers = await loadDirectory<FieldWorker>("/api/field-operations/workers", controller.signal);

          if (controller.signal.aborted) return;

          setWorkers(workers);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load field operations"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => controller.abort();
  }, [status, page, refreshKey, canManage]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  function handleUpdate(
    task: FieldTaskDTO,
    newStatus: TaskStatus
  ) {
    setSelectedTask(task);
    setNextStatus(newStatus);
    setInspectionId("");
  }

  async function submitUpdate() {
    if (!selectedTask) return;

    if (
      nextStatus === "completed" &&
      !inspectionId.trim()
    ) {
      toast.error("Inspection ID is required");
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(
        `/api/field-operations/tasks/${selectedTask._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,

            ...(nextStatus === "completed"
              ? { inspectionId: inspectionId.trim() }
              : {}),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);

      setSelectedTask(null);

      if (
        status !== "all" &&
        tasks.length === 1 &&
        page > 1
      ) {
        setPage((previous) => previous - 1);
      }

      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update task"
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <ClipboardList className="size-7 text-primary" />
            Field Operations
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage field surveillance tasks and worker activities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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

          {canManage && (
            <Button
              disabled={loading || Boolean(error)}
              onClick={() => setAssignOpen(true)}
            >
              <Plus className="size-4" />
              Assign Task
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl border bg-card">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button variant="outline" onClick={refreshData}>
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <OperationStats stats={stats} />

          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">
                <ClipboardList className="size-4" />
                Tasks
              </TabsTrigger>

              {canManage && (
                <TabsTrigger value="workers">
                  <UsersRound className="size-4" />
                  Field Workers
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent
              value="tasks"
              className="mt-4 space-y-4"
            >
              <div className="flex justify-end">
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value ?? "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Status
                    </SelectItem>

                    {taskStatuses.map((item) => (
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

              <TaskTable
                tasks={tasks}
                canManage={canManage}
                canUpdate={canUpdate}
                onUpdate={handleUpdate}
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
            </TabsContent>

            {canManage && (
              <TabsContent value="workers" className="mt-4">
                {workers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No field workers available.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {workers.map((worker) => {
                      const completionRate =
                        worker.totalTasks > 0
                          ? Math.round(
                              (worker.completedTasks /
                                worker.totalTasks) *
                                100
                            )
                          : 0;

                      return (
                        <Card key={worker.id}>
                          <CardContent className="space-y-5">
                            <div className="flex items-center gap-3">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                                {worker.name
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h3 className="font-semibold">
                                  {worker.name}
                                </h3>

                                <p className="truncate text-xs text-muted-foreground">
                                  {worker.email}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {worker.regionId ||
                                    "No region assigned"}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-lg font-bold">
                                  {worker.totalTasks}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  Total
                                </p>
                              </div>

                              <div className="rounded-lg bg-amber-500/10 p-3">
                                <p className="text-lg font-bold text-amber-600">
                                  {worker.activeTasks}
                                </p>

                                <p className="text-xs">
                                  Active
                                </p>
                              </div>

                              <div className="rounded-lg bg-emerald-500/10 p-3">
                                <p className="text-lg font-bold text-emerald-600">
                                  {worker.completedTasks}
                                </p>

                                <p className="text-xs">
                                  Completed
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>Completion Rate</span>

                                <span className="font-semibold">
                                  {worker.totalTasks > 0
                                    ? `${completionRate}%`
                                    : "N/A"}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${completionRate}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

      {assignOpen && canManage && (
        <AssignTaskDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          workers={workers}
          onSuccess={() => {
            setPage(1);
            setStatus("all");
            refreshData();
          }}
        />
      )}

      <Dialog
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open && !updating) {
            setSelectedTask(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {nextStatus === "completed"
                ? "Complete Task"
                : nextStatus === "cancelled"
                  ? "Cancel Task"
                  : "Start Task"}
            </DialogTitle>

            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>

          {nextStatus === "completed" ? (
            <div className="space-y-2">
              <Label htmlFor="inspectionId">
                Inspection Database ID
              </Label>

              <Input
                id="inspectionId"
                value={inspectionId}
                onChange={(e) =>
                  setInspectionId(e.target.value)
                }
                placeholder="24-character MongoDB ID"
              />

              <p className="text-xs text-muted-foreground">
                Copy the ID from the inspection details URL.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Are you sure you want to update this task?
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={updating}
              onClick={() => setSelectedTask(null)}
            >
              Back
            </Button>

            <Button
              variant={
                nextStatus === "cancelled"
                  ? "destructive"
                  : "default"
              }
              disabled={updating}
              onClick={submitUpdate}
            >
              {updating && (
                <Loader2 className="size-4 animate-spin" />
              )}

              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}