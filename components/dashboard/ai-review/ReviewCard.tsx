import Image from "next/image";
import {
  MapPin,
  CalendarDays,
  ScanEye,
  ImageIcon,
  UserRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ReviewInspection } from "@/app/types/review";

interface ReviewCardProps {
  inspection: ReviewInspection;
  onReview: (inspection: ReviewInspection) => void;
}

export default function ReviewCard({
  inspection,
  onReview,
}: ReviewCardProps) {
  const hasPrediction = !!inspection.prediction || inspection.confidenceScore !== null;
  const confidence =
    inspection.confidenceScore === null
      ? null
      : Math.min(
          100,
          Math.max(0, inspection.confidenceScore * 100)
        );

  const isReviewed =
    inspection.status === "verified" ||
    inspection.status === "rejected";

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {inspection.images.length > 0 ? (
          <Image
            src={inspection.images[0]}
            alt="Inspection evidence"
            fill
            unoptimized
            className="object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <ImageIcon className="size-10 text-muted-foreground" />

            <p className="text-xs text-muted-foreground">
              No inspection image
            </p>
          </div>
        )}

        <Badge className="absolute right-3 top-3 capitalize">
          {inspection.status.replaceAll("_", " ")}
        </Badge>
      </div>

      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="font-semibold">
            {inspection.location.area}
          </h3>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {inspection.inspectionId}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPin className="size-4" />
            {inspection.location.district}
          </p>

          <p className="flex items-center gap-2">
            <UserRound className="size-4" />
            {inspection.inspectorName}
          </p>

          <p className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            {new Date(
              inspection.inspectedAt
            ).toLocaleDateString("en-GB")}
          </p>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              AI Detection
            </span>

            <Badge variant="outline" className="capitalize">
              {hasPrediction ? inspection.detectionResult : "Unavailable"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Larvae Count
            </span>

            <span className="text-sm font-semibold">
              {inspection.larvaeCount ?? "N/A"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              AI Confidence
            </span>

            <span className="text-sm font-semibold">
              {confidence === null
                ? "N/A"
                : `${confidence.toFixed(1)}%`}
            </span>
          </div>

          {confidence !== null && (
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${confidence}%` }}
              />
            </div>
          )}
        </div>

        {inspection.review && (
          <div className="rounded-lg border p-3 text-xs">
            <p className="text-muted-foreground">
              Reviewed by
            </p>

            <p className="mt-1 font-medium">
              {inspection.review.reviewerName}
            </p>
          </div>
        )}

        <Button
          className="w-full"
          variant={isReviewed ? "outline" : "default"}
          onClick={() => onReview(inspection)}
        >
          <ScanEye className="size-4" />

          {isReviewed ? "View Review" : "Review Inspection"}
        </Button>
      </CardContent>
    </Card>
  );
}