"use client";

import { useEffect } from "react";
import Link from "next/link";
import L from "leaflet";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { MapInspection } from "@/app/types/map";

const markerColors = {
  positive: "#ef4444",
  negative: "#10b981",
  inconclusive: "#f59e0b",
};

function FitBounds({
  inspections,
}: {
  inspections: MapInspection[];
}) {
  const map = useMap();

  useEffect(() => {
    if (inspections.length === 0) {
      map.setView([23.685, 90.3563], 7);
      return;
    }

    const bounds = L.latLngBounds(
      inspections.map((item) => [
        item.location.latitude,
        item.location.longitude,
      ])
    );

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }, [inspections, map]);

  return null;
}

export default function MapView({
  inspections,
  canViewDetails,
}: {
  inspections: MapInspection[];
  canViewDetails: boolean;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-xl border">
      <MapContainer
        center={[23.685, 90.3563]}
        zoom={7}
        scrollWheelZoom
        preferCanvas
        className="h-[600px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds inspections={inspections} />

        {inspections.map((inspection) => (
          <CircleMarker
            key={inspection._id}
            center={[
              inspection.location.latitude,
              inspection.location.longitude,
            ]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor:
                markerColors[inspection.detectionResult],
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="min-w-52 space-y-2">
                <h3 className="text-base font-bold">
                  {inspection.location.area}
                </h3>

                <p className="text-xs text-gray-500">
                  {inspection.location.district}
                </p>

                <hr />

                <div className="space-y-1 text-sm">
                  <div>
                    <strong>AI prediction:</strong>{" "}
                    <span className="capitalize">
                      {inspection.detectionResult}
                    </span>
                  </div>

                  <div>
                    <strong>Status:</strong>{" "}
                    <span className="capitalize">
                      {inspection.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div>
                    <strong>Predicted larvae count:</strong>{" "}
                    {inspection.larvaeCount ?? "Not available"}
                  </div>

                  <div>
                    <strong>Inspector:</strong>{" "}
                    {inspection.inspectorName}
                  </div>

                  <div>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      inspection.inspectedAt
                    ).toLocaleDateString("en-GB")}
                  </div>
                </div>

                {canViewDetails && (
                  <Link
                    href={`/inspections/${inspection._id}`}
                    className="mt-3 block rounded-md bg-teal-600 px-3 py-2 text-center text-sm font-medium !text-white"
                  >
                    View Inspection
                  </Link>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute bottom-8 left-3 z-[500] space-y-3 rounded-xl border bg-card p-4 shadow-lg">
        <h3 className="text-sm font-semibold">AI Prediction Legend</h3>

        {Object.entries(markerColors).map(([label, color]) => (
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