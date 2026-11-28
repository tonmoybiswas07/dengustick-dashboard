import { auditCollection } from "@/lib/audit";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";

import {
  ArrowLeft,
  MapPin,
  UserRound,
  CalendarDays,
  ScanEye,
  ClipboardList,
  ImageIcon,
} from "lucide-react";

import { requirePermission } from "@/lib/session";
import { getInspectionFilter } from "@/lib/inspection-access";
import { inspectionsCollection, usersCollection } from "@/lib/collections";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InspectionDetailsPage({
  params,
}: PageProps) {
  const session = await requirePermission("inspections:view");

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  const filter = getInspectionFilter(session.user);

  if (!filter) {
    notFound();
  }

  const inspection = await inspectionsCollection.findOne({
    ...filter,
    _id: new ObjectId(id),
  });

  if (!inspection) {
    notFound();
  }

  const activityLabels: Record<string, string> = {
    "inspection.create": "Inspection created",
    "inspection.update": "Inspection updated",
    "inspection.review": "Manually reviewed",
    "inspection.prediction.queued": "Prediction queued",
    "inspection.prediction.completed": "Prediction completed",
    "inspection.prediction.cancelled": "Prediction cancelled",
    "inspection.prediction.failed": "Prediction failed",
  };
  const history = await auditCollection.find({
    resource: "inspection", resourceId: inspection._id.toHexString(),
    action: { $in: Object.keys(activityLabels) }, outcome: "success",
  }).project({ actorId: 1, action: 1, timestamp: 1, "metadata.decision": 1 }).sort({ timestamp: -1 }).limit(20).toArray();
  const actorIds = [...new Set(history.map((event) => event.actorId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
  const actors = new Map((await usersCollection.find({ _id: { $in: actorIds.map((id) => new ObjectId(id)) } })
    .project({ name: 1 }).toArray()).map((actor) => [String(actor._id), actor.name]));


  const details = [
    {
      label: "Inspector",
      value: inspection.inspectorName,
      icon: UserRound,
    },
    {
      label: "Inspection Date",
      value: new Date(
        inspection.inspectedAt
      ).toLocaleDateString("en-GB"),
      icon: CalendarDays,
    },
    {
      label: "Region",
      value: inspection.regionId,
      icon: MapPin,
    },
    {
      label: "Breeding Site",
      value: inspection.breedingSiteType.replaceAll("_", " "),
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6">
      <Link href="/inspections" className={buttonVariants({ variant: "outline" })}>
        <ArrowLeft className="size-4" />
        Back to Inspections
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Inspection Details
          </h1>

          <p className="mt-1 break-all text-sm text-muted-foreground">
            {inspection.inspectionId}
          </p>
        </div>

        <Badge variant="outline" className="capitalize">
          {inspection.status.replaceAll("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {details.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <CardContent className="space-y-3">
                <Icon className="size-5 text-primary" />

                <p className="text-sm text-muted-foreground">
                  {item.label}
                </p>

                <p className="font-semibold capitalize">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Location Information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium">
                {inspection.location.address}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">District</p>
              <p>{inspection.location.district}</p>
            </div>

            <div>
              <p className="text-muted-foreground">Area</p>
              <p>{inspection.location.area}</p>
            </div>

            <div>
              <p className="text-muted-foreground">
                GPS Coordinates
              </p>
              <p>
                {inspection.location.latitude},{" "}
                {inspection.location.longitude}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanEye className="size-5 text-primary" />
              AI Detection Results
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Detection Result
              </p>

              <p className="mt-1 text-xl font-semibold capitalize">
                {inspection.detectionResult}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Larvae Count
              </p>

              <p className="text-2xl font-bold">
                {inspection.larvaeCount ?? "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                AI Confidence Score
              </p>

              <p className="mt-1 font-semibold">
                {inspection.confidenceScore === null
                  ? "Not processed"
                  : `${(
                      inspection.confidenceScore * 100
                    ).toFixed(1)}%`}
              </p>

              {inspection.confidenceScore !== null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          inspection.confidenceScore * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              AI confidence indicates model prediction certainty,
              not dengue transmission risk.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            Inspection Images
          </CardTitle>
        </CardHeader>

        <CardContent>
          {inspection.images.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No images available
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inspection.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="relative aspect-video overflow-hidden rounded-xl border"
                >
                  <Image
                    src={image}
                    alt={`Inspection image ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Notes</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {inspection.notes || "No additional notes."}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Inspection activity</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No recorded activity.</p> : (
            <ol className="space-y-3 text-sm">
              {history.map((event) => <li key={String(event._id)} className="border-l-2 border-primary/40 pl-3">
                <p>{activityLabels[event.action]}{event.metadata?.decision && ` (${event.metadata.decision})`} · {actors.get(event.actorId ?? "") ?? "Account unavailable"}</p>
                <time className="text-muted-foreground" dateTime={event.timestamp.toISOString()}>{event.timestamp.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</time>
              </li>)}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}