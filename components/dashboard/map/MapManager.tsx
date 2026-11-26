"use client";

import { useEffect, useMemo, useState } from "react";
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
      <Loader2 className="size-8 animate-spin text-primary" />
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

        const response = await fetch("/api/map", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Failed to load map"
          );
        }

        if (controller.signal.aborted) return;

        setInspections(result.data);
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

    void fetchInspections();

    return () => controller.abort();
  }, [refreshKey]);

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          inspections.map((item) => item.location.district)
        )
      ).sort(),
    [inspections]
  );

  const filteredInspections = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inspections.filter((item) => {
      const matchesSearch = [
        item.location.area,
        item.location.district,
        item.location.address,
        item.inspectionId,
      ].some((value) =>
        value.toLowerCase().includes(query)
      );

      const matchesDistrict =
        district === "all" ||
        item.location.district === district;

      const matchesDetection =
        detection === "all" ||
        item.detectionResult === detection;

      return (
        matchesSearch &&
        matchesDistrict &&
        matchesDetection
      );
    });
  }, [inspections, search, district, detection]);

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

      {loading ? (
        <div className="flex h-[600px] items-center justify-center rounded-xl border bg-card">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : error ? (
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
          <MapStats inspections={filteredInspections} />

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
            }}
          />

          {truncated && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              Showing the latest {inspections.length} of {total}{" "}
              mapped inspections. Filters apply to loaded records.
            </p>
          )}

          <MapView
            inspections={filteredInspections}
            canViewDetails={hasPermission(
              role,
              "inspections:view"
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              Showing {filteredInspections.length} of{" "}
              {inspections.length} loaded inspections
            </p>

            <p>Map data © OpenStreetMap contributors</p>
          </div>

          {filteredInspections.length === 0 && (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No inspection locations match your filters.
            </p>
          )}
        </>
      )}
    </div>
  );
}