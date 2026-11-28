"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";

import MapStats from "./MapStats";
import MapFilters from "./MapFilters";

import type { MapInspection } from "@/app/types/map";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-xl border bg-card">
      <Loader2 className="size-8 motion-safe:animate-spin text-primary" />
    </div>
  ),
});

export default function MapManager({
  role,
}: {
  role: string;
}) {
  const [inspections, setInspections] = useState<MapInspection[]>([]);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");
  const [detection, setDetection] = useState("all");
  const [districts, setDistricts] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState<"markers" | "grid" | "heat">("markers");
  const [viewport, setViewport] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInspections() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        for (const [key, value] of Object.entries({ search, district, detection, start, end, region, status, viewport })) {
          if (value && value !== "all") query.set(key, value);
        }
        const response = await fetch(`/api/map?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setInspections([]);
            setDistricts([]);
            setLoaded(false);
          }
          throw new Error(
            result.message || "Failed to load map"
          );
        }

        if (controller.signal.aborted) return;

        setInspections(result.data);
        setLoaded(true);
        setDistricts(result.districts);
        setTruncated(result.truncated);
        setTotal(result.total);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load map"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(fetchInspections, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [refreshKey, search, district, detection, start, end, region, status, viewport]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <MapPinned className="size-7 text-primary" />
            Geospatial Map
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Visualize mosquito breeding sites and surveillance
            inspection locations.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={loading}
          onClick={() =>
            setRefreshKey((previous) => previous + 1)
          }
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh Map
        </Button>
      </div>

          <MapFilters
            search={search}
            district={district}
            detection={detection}
            districts={districts}
            onSearchChange={setSearch}
            onDistrictChange={setDistrict}
            onDetectionChange={setDetection}
            onReset={() => {
              setSearch("");
              setDistrict("all");
              setDetection("all");
              setStart(""); setEnd(""); setRegion(""); setStatus("all"); setViewport("");
            }}
          />

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>From <input className="block rounded border bg-background p-2" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
        <label>Through <input className="block rounded border bg-background p-2" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        {role === "admin" && <label>Region ID <input className="block rounded border bg-background p-2" maxLength={24} value={region} onChange={(event) => setRegion(event.target.value)} /></label>}
        <label>Inspection status <select className="block rounded border bg-background p-2" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option><option value="pending">Pending</option><option value="under_review">Under review</option><option value="verified">Verified only</option><option value="rejected">Rejected</option>
        </select></label>
        <label>Map display <select className="block rounded border bg-background p-2" value={mode}
          onChange={(event) => setMode(event.target.value as typeof mode)}>
          <option value="markers">Clustered markers</option><option value="grid">Density grid</option><option value="heat">Heatmap</option>
        </select></label>
        {viewport && <Button variant="outline" onClick={() => setViewport("")}>Clear map area</Button>}
      </div>

      {loading && !loaded ? (
        <div className="flex h-[600px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="size-8 motion-safe:animate-spin text-primary" />
        </div>
      ) : error && !loaded ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-card">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button
            variant="outline"
            onClick={() =>
              setRefreshKey((previous) => previous + 1)
            }
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          {loading && <p role="status" className="text-sm text-muted-foreground">Updating map…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error} Previous results are still displayed.</p>}
          <MapStats inspections={inspections} />

          {truncated && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              Showing the latest {inspections.length} of {total}{" "}
              mapped inspections.
            </p>
          )}

          <MapView
            inspections={inspections}
            mode={mode}
            viewport={viewport}
            onViewport={setViewport}
            canViewDetails={hasPermission(
              role,
              "inspections:view"
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              Showing {inspections.length} of {total} matching inspections
            </p>

            <p>Map data © OpenStreetMap contributors</p>
          </div>

          {inspections.length === 0 && (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No inspection locations match your filters.
            </p>
          )}
        </>
      )}
    </div>
  );
}