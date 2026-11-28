"use client";

import { ContentSkeleton } from "@/components/dashboard/ContentSkeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";

import { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";

import InspectionStats from "./InspectionStats";
import InspectionFilters from "./InspectionFilters";
import InspectionTable from "./InspectionTable";
import AddInspectionForm from "./AddInspectionForm";

import type { InspectionDTO } from "@/app/types/inspection";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InspectionManagerProps {
  role: string;
}

export default function InspectionManager({
  role,
}: InspectionManagerProps) {
  const [inspections, setInspections] = useState<InspectionDTO[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<InspectionDTO | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
          search,
          status,
        });

        const [listResponse, statsResponse] = await Promise.all([
          fetch(`/api/inspections?${params}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/inspections/stats", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        const [listResult, statsResult] = await Promise.all([
          listResponse.json(),
          statsResponse.json(),
        ]);

        if (!listResponse.ok || !statsResponse.ok) {
          throw new Error(
            !listResponse.ok
              ? listResult.message
              : statsResult.message
          );
        }

        if (controller.signal.aborted) return;

        setInspections(listResult.data);
        setStats(statsResult.data);
        setTotal(listResult.pagination.total);
        setTotalPages(listResult.pagination.totalPages);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load inspections"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, status, refreshKey]);

  function refreshData() {
    setRefreshKey((previous) => previous + 1);
  }

  function handleAdd() {
    setSelected(null);
    setFormOpen(true);
  }

  function handleEdit(inspection: InspectionDTO) {
    setSelected(inspection);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteId) return;

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/inspections/${deleteId}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success("Inspection deleted successfully");
      setDeleteId(null);

      if (inspections.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      }

      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete inspection"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title="Inspections" icon={<ClipboardList />}
          description="Manage and monitor field surveillance inspections." />

        {hasPermission(role, "inspections:create") && (
          <Button onClick={handleAdd}>
            <Plus className="size-4" />
            Add Inspection
          </Button>
        )}
      </div>

      {!error && <InspectionStats stats={stats} />}

      <InspectionFilters
        search={search}
        status={status}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onReset={() => {
          setSearch("");
          setStatus("all");
          setPage(1);
        }}
      />

      {loading ? (
        <ContentSkeleton label="Loading inspections…" className="min-h-64" />
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button variant="outline" onClick={refreshData}>
            Try Again
          </Button>
        </div>
      ) : (
        <InspectionTable
          inspections={inspections}
          role={role}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onEdit={handleEdit}
          onDelete={setDeleteId}
        />
      )}

      {formOpen && (
        <AddInspectionForm
          key={selected?._id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={refreshData}
          role={role}
          inspection={selected}
        />
      )}

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Inspection?
            </AlertDialogTitle>

            <AlertDialogDescription>
              This inspection will be permanently deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete Inspection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}