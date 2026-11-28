"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { ReviewInspection } from "@/app/types/review";

export function PredictionControls({
  inspection,
  enabled,
  onQueued,
}: {
  inspection: ReviewInspection;
  enabled: boolean;
  onQueued: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const status =
    inspection.predictionJob?.status ??
    (inspection.prediction ? "completed" : "not submitted");
  const canQueue =
    ["pending", "under_review"].includes(inspection.status) &&
    !inspection.prediction &&
    ["not submitted", "failed"].includes(status) &&
    (inspection.predictionJob?.attempts ?? 0) < 3 &&
    inspection.images.some((image) =>
      image.startsWith("/api/inspection-images/"),
    );

  async function change(method: "POST" | "DELETE") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/ai-review/${inspection._id}/prediction`,
        { method },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? "Could not update prediction");
      }
      onQueued();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not queue prediction",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p>
        Prediction processing <span className="capitalize">{status}</span>
      </p>
      {status === "failed" && (
        <p className="text-muted-foreground">
          {inspection.predictionJob?.failure === "cancelled" ? "The request was cancelled." :
            `Prediction failed after ${inspection.predictionJob?.attempts} attempts.`}
        </p>
      )}
      {canQueue && !enabled && <p className="text-muted-foreground">Prediction dispatch is unavailable.</p>}
      {["pending", "processing"].includes(status) && (
        <Button type="button" variant="outline" disabled={busy} onClick={() => change("DELETE")}>
          {status === "pending" ? "Cancel queued prediction" : "Cancel expired processing"}
        </Button>
      )}
      {canQueue && enabled && (
        <Button type="button" variant="outline" disabled={busy} onClick={() => change("POST")}>
          {busy
            ? "Queuing…"
            : status === "failed"
              ? "Retry prediction"
              : "Queue prediction"}
        </Button>
      )}
      {message && (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

export function PredictionEvidence({
  inspection,
}: {
  inspection: ReviewInspection;
}) {
  const prediction = inspection.prediction;
  const source = inspection.predictionJob?.imageUrl;
  const [ratio, setRatio] = useState<number>();
  const [annotated, setAnnotated] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!prediction || !source || !inspection.images.includes(source))
    return null;
  const visible =
    annotated && prediction.annotatedImageId
      ? `/api/ai-review/${inspection._id}/annotation`
      : source;

  return (
    <section
      className="space-y-2 rounded-md border p-3"
      aria-label="Prediction evidence"
    >
      <p className="text-sm font-medium">Prediction evidence</p>
      {prediction.annotatedImageId && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAnnotated((value) => !value);
            setFailed(false);
            setRatio(undefined);
          }}
        >
          {annotated ? "Show original and boxes" : "Show annotated image"}
        </Button>
      )}
      {failed ? (
        <p role="status" className="text-sm">
          This evidence image is unavailable.
        </p>
      ) : (
        <div className="relative w-full" style={{ aspectRatio: ratio ?? 1 }}>
          <Image
            src={visible}
            alt={
              annotated
                ? "Model-annotated evidence"
                : "Evidence used for prediction"
            }
            fill
            unoptimized
            onError={() => setFailed(true)}
            onLoad={(event) =>
              setRatio(
                event.currentTarget.naturalWidth /
                  event.currentTarget.naturalHeight,
              )
            }
          />
          {!annotated &&
            ratio &&
            prediction.boxes?.map((box, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-teal-400"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
              />
            ))}
        </div>
      )}
      {!!prediction.boxes?.length && (
        <p className="text-xs text-muted-foreground">
          {prediction.boxes.length} model-marked areas
        </p>
      )}
    </section>
  );
}
