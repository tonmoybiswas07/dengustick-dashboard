"use client";

import { ContentSkeleton } from "@/components/dashboard/ContentSkeleton";
import { PageHeader } from "@/components/dashboard/PageHeader";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/permissions";

import MapStats from "./MapStats";
import MapFilters from "./MapFilters";

import type { MapInspection } from "@/app/types/map";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <ContentSkeleton label="Loading inspection map…" className="min-h-72" />
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
  const [total, setTotal] = useState<number | null>(0);
  const [districtsUnavailable, setDistrictsUnavailable] = useState(false);
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

        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setInspections([]);
          setDistricts([]);
          setDistrictsUnavailable(false);
          setLoaded(false);
          setTotal(0);
          setTruncated(false);
          throw new Error("You no longer have access to inspection locations.");
        }

        const result = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok) {
          throw new Error(typeof result?.message === "string" ? result.message : "Failed to load inspection locations.");
        }
        if (result?.success !== true || !Array.isArray(result.data)
          || (result.districts !== null && !Array.isArray(result.districts))
          || (result.total !== null && !Number.isSafeInteger(result.total)) || typeof result.truncated !== "boolean") {
          throw new Error("The inspection locations response was invalid.");
        }

        setInspections(result.data);
        setLoaded(true);
        setDistrictsUnavailable(result.districts === null);
        if (result.districts !== null) {
          setDistricts(result.districts);
        } else {
          const returnedDistricts = (result.data as MapInspection[])
            .map((inspection) => inspection.location?.district)
            .filter((name): name is string => typeof name === "string" && name.length > 0);
          setDistricts((current) => [...new Set([...current, ...returnedDistricts])].sort());
        }
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
        <PageHeader title="Geospatial Map" icon={<MapPinned />}
          description="Visualize mosquito breeding sites and surveillance inspection locations." />

        <Button
          variant="outline"
          disabled={loading}
          onClick={() =>
            setRefreshKey((previous) => previous + 1)
          }
        >
          <RefreshCw
            className={`size-4 ${
              loading ? "motion-safe:animate-spin" : ""
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

      {loaded && <MapStats inspections={inspections} />}

      {truncated && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {total === null
            ? `Showing the latest ${inspections.length} mapped inspections. Zoom in or narrow your filters for more detail.`
            : `Showing the latest ${inspections.length} of ${total} mapped inspections.`}
        </p>
      )}

      <MapView
        inspections={inspections}
        mode={mode}
        viewport={viewport}
        onViewport={setViewport}
        canViewDetails={hasPermission(role, "inspections:view")}
      />

      {loading && <p role="status" className="text-sm text-muted-foreground">Loading inspection locations…</p>}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <p role="alert" className="text-sm text-destructive">
            {error}{loaded && " Previous results are still displayed."}
          </p>
          <Button variant="outline" onClick={() => setRefreshKey((previous) => previous + 1)}>Try again</Button>
        </div>
      )}
      {districtsUnavailable && !loading && !error && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <p role="status">Some district options may be unavailable.</p>
          <Button variant="outline" onClick={() => setRefreshKey((previous) => previous + 1)}>Retry district options</Button>
        </div>
      )}
      {loaded && !loading && !error && !truncated && (
        <p role="status" className="text-sm text-muted-foreground">
          {inspections.length === 0
            ? "No inspection locations match your filters."
            : `Showing ${inspections.length} of ${total} matching inspections.`}
        </p>
      )}
    </div>
  );
}