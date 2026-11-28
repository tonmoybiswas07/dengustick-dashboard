"use client";

import { useEffect, useRef, useState } from "react";
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

const markerColors = {
  positive: "#ef4444",
  negative: "#10b981",
  inconclusive: "#f59e0b",
};

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
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
    if (viewport) return;
    fittingRef.current = true;
    try {
      if (inspections.length === 0) {
        map.setView([23.685, 90.3563], 7, { animate: false });
        return;
      }
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
    onViewport([
      Math.max(-90, bounds.getSouth()), wholeWorld ? -180 : L.Util.wrapNum(bounds.getWest(), [-180, 180]),
      Math.min(90, bounds.getNorth()), wholeWorld ? 180 : L.Util.wrapNum(bounds.getEast(), [-180, 180]),
    ].map((coordinate) => coordinate.toFixed(5)).join(","));
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
    if (!context || !pane) return;
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.setAttribute("aria-hidden", "true");
    pane.appendChild(canvas);
    let frame = 0;
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { x: width, y: height } = map.getSize();
        canvas.width = width;
        canvas.height = height;
        L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
        context.globalCompositeOperation = "lighter";
        const centerLongitude = map.getCenter().lng;
        for (const { location } of inspections) {
          const worldOffset = 360 * Math.round((centerLongitude - location.longitude) / 360);
          const { x, y } = map.latLngToContainerPoint([location.latitude, location.longitude + worldOffset]);
          const radius = 24;
          if (x < -radius || y < -radius || x > width + radius || y > height + radius) continue;
          const glow = context.createRadialGradient(x, y, 0, x, y, radius);
          glow.addColorStop(0, "rgba(239, 105, 36, 0.42)");
          glow.addColorStop(0.4, "rgba(20, 184, 166, 0.22)");
          glow.addColorStop(1, "rgba(20, 184, 166, 0)");
          context.fillStyle = glow;
          context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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
    <div ref={container} className="relative isolate overflow-hidden rounded-xl border bg-background">
      <button type="button" onClick={toggleFullscreen} className="absolute right-3 top-3 z-[500] rounded border bg-card p-2 text-sm shadow-sm">
        {fullscreen ? "Exit fullscreen" : "Fullscreen map"}
      </button>
      {fullscreenError && <p role="alert" className="absolute right-3 top-14 z-[500] rounded border bg-card p-2 text-sm">{fullscreenError}</p>}
      <MapContainer
        center={[23.685, 90.3563]}
        zoom={7}
        scrollWheelZoom
        preferCanvas
        className={fullscreen ? "h-dvh w-full" : "h-[min(65dvh,600px)] min-h-80 w-full"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SearchArea inspections={inspections} viewport={viewport} onViewport={onViewport} />
        <ResizeMap />

        {mode === "heat" ? <InspectionHeatmap inspections={inspections} /> :
          <GroupedMarkers inspections={inspections} density={mode === "grid"} canViewDetails={canViewDetails} />}
      </MapContainer>

      <div className="absolute bottom-8 left-3 z-[500] space-y-3 rounded-xl border bg-card p-4 shadow-lg">
        <h3 className="text-sm font-semibold">{mode !== "markers" ? "Inspection density" : "AI prediction and cluster legend"}</h3>

        {mode === "heat" && <p className="max-w-48 text-xs">Brighter areas show more recorded inspection locations.</p>}
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