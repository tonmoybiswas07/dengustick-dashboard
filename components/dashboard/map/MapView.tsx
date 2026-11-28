"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { MapInspection } from "@/app/types/map";

const initialCenter: L.LatLngTuple = [23.685, 90.3563];
const initialZoom = 7;

const markerColors = {
  positive: "#ef4444",
  negative: "#10b981",
  inconclusive: "#f59e0b",
};

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const element = map.getContainer();
    let frame = 0;
    function scheduleResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (element.clientWidth > 0 && element.clientHeight > 0) {
          map.invalidateSize({ pan: false, debounceMoveend: true });
        }
      });
    }

    const observer = new ResizeObserver(scheduleResize);
    observer.observe(element);
    document.addEventListener("fullscreenchange", scheduleResize);
    scheduleResize();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("fullscreenchange", scheduleResize);
    };
  }, [map]);
  return null;
}

function GroupedMarkers({ inspections, density, canViewDetails }: { inspections: MapInspection[]; density: boolean; canViewDetails: boolean }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = new Map<string, MapInspection[]>();
  for (const item of inspections) {
    const center = [item.location.latitude, item.location.longitude] as L.LatLngTuple;
    const point = map.project(center, zoom);
    const key = !density && zoom >= 16 ? item._id : `${Math.floor(point.x / 48)}:${Math.floor(point.y / 48)}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups].map(([key, group]) => {
    const sample = group[0];
    const center: L.LatLngTuple = [
      group.reduce((sum, item) => sum + item.location.latitude, 0) / group.length,
      group.reduce((sum, item) => sum + item.location.longitude, 0) / group.length,
    ];
    const grouped = group.length > 1;
    const fillColor = density ? "#0d9488" : grouped ? "#0f766e" :
      sample.confidenceScore === null ? "#64748b" : markerColors[sample.detectionResult];
    return (
      <CircleMarker key={key} center={center}
        radius={density ? Math.min(34, 9 + Math.sqrt(group.length) * 4) : grouped ? 15 : 8}
        pathOptions={{ color: fillColor, fillColor, fillOpacity: density ? Math.min(0.85, 0.12 + group.length * 0.045) : 0.85 }}>
        <Popup>
          <p className="font-semibold">{group.length} {grouped ? "inspections" : "inspection"}{density ? " in this density cell" : ""}</p>
          {group.slice(0, 8).map((item) => (
            <p key={item._id}>
              {canViewDetails ? <Link href={`/inspections/${item._id}`}>{item.inspectionId}</Link> : item.inspectionId}
              {" · "}{item.location.area}, {item.location.district}{" · "}{item.status.replaceAll("_", " ")}
            </p>
          ))}
          {!grouped && <div className="text-sm">
            <p>AI prediction: {sample.confidenceScore === null ? "Unavailable" : sample.detectionResult}</p>
            <p>Predicted larvae: {sample.larvaeCount ?? "N/A"}</p>
            <p>Inspector: {sample.inspectorName}</p>
            <p>{new Date(sample.inspectedAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}</p>
          </div>}
          {group.length > 8 && <p>Zoom in to inspect more records.</p>}
        </Popup>
      </CircleMarker>
    );
  });
}

function SearchArea({ inspections, viewport, onViewport }: {
  inspections: MapInspection[];
  viewport: string;
  onViewport: (bounds: string) => void;
}) {
  const map = useMap();
  const fittingRef = useRef(false);
  useEffect(() => {
    if (viewport || inspections.length === 0) return;
    fittingRef.current = true;
    try {
      const bounds = L.latLngBounds(inspections.map(({ location }) => [location.latitude, location.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
    } finally {
      fittingRef.current = false;
    }
  }, [inspections, map, viewport]);
  const publish = () => {
    if (fittingRef.current) return;
    const bounds = map.getBounds();
    const wholeWorld = bounds.getEast() - bounds.getWest() >= 360;
    const [south, west, north, east] = [
      Math.max(-90, bounds.getSouth()), wholeWorld ? -180 : L.Util.wrapNum(bounds.getWest(), [-180, 180]),
      Math.min(90, bounds.getNorth()), wholeWorld ? 180 : L.Util.wrapNum(bounds.getEast(), [-180, 180]),
    ].map((coordinate) => coordinate.toFixed(5));
    if (Number(south) >= Number(north) || west === east) return;
    onViewport([south, west, north, east].join(","));
  };
  useMapEvents({ dragend: publish, zoomend: publish });
  return <button type="button" className="absolute left-14 top-3 z-[500] rounded border bg-card p-2 text-sm shadow-sm"
    onClick={publish}>Search this area</button>;
}

function InspectionHeatmap({ inspections }: { inspections: MapInspection[] }) {
  const map = useMap();
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const pane = map.getPane("overlayPane");
    const radius = 24;
    const stamp = document.createElement("canvas");
    stamp.width = stamp.height = radius * 2;
    const brush = stamp.getContext("2d");
    if (!context || !pane || !brush) return;
    const glow = brush.createRadialGradient(radius, radius, 0, radius, radius, radius);
    glow.addColorStop(0, "rgba(239, 105, 36, 0.42)");
    glow.addColorStop(0.4, "rgba(20, 184, 166, 0.22)");
    glow.addColorStop(1, "rgba(20, 184, 166, 0)");
    brush.fillStyle = glow;
    brush.fillRect(0, 0, radius * 2, radius * 2);
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.setAttribute("aria-hidden", "true");
    pane.appendChild(canvas);
    let frame = 0;
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { x: width, y: height } = map.getSize();
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        context.clearRect(0, 0, width, height);
        L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
        context.globalCompositeOperation = "lighter";
        const centerLongitude = map.getCenter().lng;
        for (const { location } of inspections) {
          const worldOffset = 360 * Math.round((centerLongitude - location.longitude) / 360);
          const { x, y } = map.latLngToContainerPoint([location.latitude, location.longitude + worldOffset]);
          if (x < -radius || y < -radius || x > width + radius || y > height + radius) continue;
          context.drawImage(stamp, x - radius, y - radius);
        }
      });
    };
    map.on("move zoom resize", draw);
    draw();
    return () => {
      map.off("move zoom resize", draw);
      cancelAnimationFrame(frame);
      canvas.remove();
    };
  }, [inspections, map]);
  return null;
}

export default function MapView({
  inspections,
  canViewDetails,
  mode, viewport, onViewport,
}: {
  inspections: MapInspection[];
  canViewDetails: boolean;
  mode: "markers" | "grid" | "heat";
  viewport: string;
  onViewport: (bounds: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [tileUnavailable, setTileUnavailable] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const tileEvents = useMemo(() => ({
    tileerror: () => setTileUnavailable(true),
    tileload: () => setTileUnavailable(false),
  }), []);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (container.current?.requestFullscreen) await container.current.requestFullscreen();
      else setFullscreenError("Fullscreen is unavailable on this device.");
    } catch {
      setFullscreenError("Could not change fullscreen mode.");
    }
  }

  return (
    <div ref={container} className="surveillance-map relative isolate flex w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-sm font-medium">Inspection locations</span>
        <button type="button" onClick={toggleFullscreen} className="min-h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted">
          {fullscreen ? "Exit fullscreen" : "Fullscreen map"}
        </button>
        {fullscreenError && <p role="alert" className="w-full text-sm text-destructive">{fullscreenError}</p>}
      </div>
      {tileUnavailable && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
          <p role="status">OpenStreetMap tiles could not load.</p>
          <button type="button" className="rounded border px-2 py-1" onClick={() => {
            setTileUnavailable(false);
            setTileAttempt((attempt) => attempt + 1);
          }}>Retry tiles</button>
        </div>
      )}
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom
        preferCanvas
        className="surveillance-map-viewport"
      >
        <TileLayer
          key={tileAttempt}
          referrerPolicy="strict-origin"
          eventHandlers={tileEvents}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SearchArea inspections={inspections} viewport={viewport} onViewport={onViewport} />
        <ResizeMap />

        {mode === "heat" ? <InspectionHeatmap inspections={inspections} /> :
          <GroupedMarkers inspections={inspections} density={mode === "grid"} canViewDetails={canViewDetails} />}
      </MapContainer>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t px-3 py-2">
        <p className="text-xs font-semibold">{mode !== "markers" ? "Inspection density" : "AI prediction and cluster legend"}</p>

        {mode === "heat" && <p className="text-xs text-muted-foreground">Brighter areas show more recorded inspection locations.</p>}
        {mode === "markers" && Object.entries({ ...markerColors, unavailable: "#64748b", cluster: "#0f766e" }).map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: color }}
            />

            <span className="text-xs capitalize">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}