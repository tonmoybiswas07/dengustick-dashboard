"use client";

import { PredictionControls, PredictionEvidence } from "./PredictionControls";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import {
  ShieldCheck,
  CircleX,
  Loader2,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ReviewInspection } from "@/app/types/review";
import type { DetectionResult } from "@/app/types/inspection";

interface ReviewDialogProps {
  predictionEnabled: boolean;
  inspection: ReviewInspection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ReviewDialog({
  inspection,
  open,
  onOpenChange,
  onSuccess,
  predictionEnabled,
}: ReviewDialogProps) {
  const [loading, setLoading] = useState(false);

  const [selectedImage, setSelectedImage] = useState(0);

  const [detection, setDetection] =
    useState<DetectionResult | "">("");

  const [larvaeCount, setLarvaeCount] = useState("");

  const [notes, setNotes] = useState("");

  const isReviewed =
    inspection.status === "verified" ||
    inspection.status === "rejected";

  async function submitReview(
    decision: "verified" | "rejected"
  ) {
    if (notes.trim().length < 5) {
      toast.error("Please provide review notes");
      return;
    }

    if (decision === "verified" && !detection) {
      toast.error("Select a verified detection result");
      return;
    }

    const count =
      larvaeCount.trim() === ""
        ? null
        : Number(larvaeCount);

    if (
      decision === "verified" &&
      count !== null &&
      (!Number.isInteger(count) || count < 0)
    ) {
      toast.error("Enter a valid larvae count");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/ai-review/${inspection._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,

            verifiedDetectionResult:
              decision === "verified" ? detection : null,

            verifiedLarvaeCount:
              decision === "verified" ? count : null,

            reviewNotes: notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit review"
      );
    } finally {
      setLoading(false);
    }
  }

  const hasPrediction = !!inspection.prediction || inspection.confidenceScore !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isReviewed
              ? "Inspection Review Details"
              : "Review Inspection"}
          </DialogTitle>

          <DialogDescription>
            {inspection.location.area},{" "}
            {inspection.location.district}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {inspection.images.length > 0 ? (
                <Image
                  src={inspection.images[selectedImage]}
                  alt={`Inspection evidence ${selectedImage + 1} of ${inspection.images.length}`}
                  fill
                  unoptimized
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="size-10 text-muted-foreground" />

                  <p className="text-sm text-muted-foreground">
                    No image available
                  </p>
                </div>
              )}
            </div>

            {inspection.images[selectedImage] && (
              <a href={inspection.images[selectedImage]} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                Open full-size evidence (new tab)
              </a>
            )}
            <div className="flex flex-wrap gap-2">
              {inspection.images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={selectedImage === index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative size-16 overflow-hidden rounded-lg border-2 ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Evidence ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">
                Field Notes
              </h3>

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {inspection.notes || "No field notes"}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <PredictionControls enabled={predictionEnabled} inspection={inspection} onQueued={onSuccess} />
            <PredictionEvidence key={inspection._id} inspection={inspection} />
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <h3 className="font-semibold">Original AI Prediction</h3>
              {!hasPrediction && <p className="text-sm text-muted-foreground">No original prediction is available for this inspection.</p>}
              {inspection.prediction && (
                <p className="text-sm text-muted-foreground">
                  {inspection.prediction.modelName ?? "Model"} · {inspection.prediction.modelVersion}
                </p>
              )}

              <div className="flex justify-between text-sm">
                <span>Detection</span>

                <Badge variant="outline" className="capitalize">
                  {hasPrediction ? inspection.detectionResult : "Unavailable"}
                </Badge>
              </div>

              <div className="flex justify-between text-sm">
                <span>Larvae Count</span>
                <span>{inspection.larvaeCount ?? "N/A"}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Confidence</span>

                <span>
                  {inspection.confidenceScore === null
                    ? "N/A"
                    : `${(
                        inspection.confidenceScore * 100
                      ).toFixed(1)}%`}
                </span>
              </div>
            </div>

            {isReviewed ? (
              <div className="space-y-3 rounded-xl border p-4">
                <h3 className="font-semibold">
                  Manual Review Result
                </h3>

                <Badge className="capitalize">
                  {inspection.status}
                </Badge>

                <p className="text-sm">
                  Reviewer:{" "}
                  {inspection.review?.reviewerName ?? "N/A"}
                </p>

                <p className="text-sm capitalize">
                  Detection:{" "}
                  {inspection.review?.verifiedDetectionResult ??
                    "N/A"}
                </p>

                <p className="text-sm">
                  Larvae Count:{" "}
                  {inspection.review?.verifiedLarvaeCount ??
                    "N/A"}
                </p>

                <p className="text-sm">
                  Reviewed:{" "}
                  {inspection.review?.reviewedAt
                    ? new Date(
                        inspection.review.reviewedAt
                      ).toLocaleString("en-GB")
                    : "N/A"}
                </p>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {inspection.review?.reviewNotes ??
                    "No review notes"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">
                  Manual Verification
                </h3>

                <div className="space-y-2">
                  <Label>Verified Detection Result</Label>

                  <Select<DetectionResult | "">
                    value={detection}
                    onValueChange={(value) =>
                      setDetection(value ?? "")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select detection result" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="positive">
                        Positive
                      </SelectItem>

                      <SelectItem value="negative">
                        Negative
                      </SelectItem>

                      <SelectItem value="inconclusive">
                        Inconclusive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="larvaeCount">
                    Verified Larvae Count
                  </Label>

                  <Input
                    id="larvaeCount"
                    type="number"
                    min={0}
                    step={1}
                    value={larvaeCount}
                    onChange={(e) =>
                      setLarvaeCount(e.target.value)
                    }
                    placeholder="Enter count if known"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">
                    Review Notes
                  </Label>

                  <Textarea
                    id="reviewNotes"
                    value={notes}
                    onChange={(e) =>
                      setNotes(e.target.value)
                    }
                    placeholder="Explain your review decision..."
                    rows={4}
                    maxLength={2000}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          {!isReviewed && (
            <>
              <Button
                variant="destructive"
                disabled={loading}
                onClick={() => submitReview("rejected")}
              >
                <CircleX className="size-4" />
                Reject
              </Button>

              <Button
                disabled={loading}
                onClick={() => submitReview("verified")}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {loading ? (
                  <Loader2 className="size-4 motion-safe:animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}

                Verify Inspection
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}