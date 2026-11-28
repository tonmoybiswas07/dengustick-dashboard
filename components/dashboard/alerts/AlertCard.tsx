"use client";

import Link from "next/link";
import ActivityHistory from "@/components/dashboard/ActivityHistory";

import {
  BellRing,
  Clock3,
  MapPin,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  ArrowUpRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

import {
  severityColors,
  alertTypeLabels,
  alertStatusColors,
} from "@/app/constants/alert";

import type { AlertDTO } from "@/app/types/alert";

interface AlertCardProps {
  alert: AlertDTO;
  canManage: boolean;
  canViewSource: boolean;
  updating: boolean;
  onRead: (id: string) => void;
  onResolve: (alert: AlertDTO) => void;
}

export default function AlertCard({
  alert,
  canManage,
  canViewSource,
  updating,
  onRead,
  onResolve,
}: AlertCardProps) {
  const Icon =
    alert.type === "positive_detection"
      ? BellRing
      : Clock3;

  const sourceHref =
    alert.sourceType === "inspection"
      ? `/inspections/${alert.sourceId}`
      : "/field-operations";

  return (
    <Card
      className={`gap-0 py-0 ${
        !alert.isRead
          ? "border-l-4 border-l-primary"
          : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${severityColors[alert.severity]}`}
          >
            <Icon className="size-6" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">
                {alert.title}
              </h3>

              {!alert.isRead && (
                <span className="size-2 rounded-full bg-primary" />
              )}

              <Badge
                variant="outline"
                className={`capitalize ${severityColors[alert.severity]}`}
              >
                {alert.severity}
              </Badge>

              <Badge
                variant="outline"
                className={`capitalize ${alertStatusColors[alert.status]}`}
              >
                {alert.status}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {alert.message}
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {alert.location.area},{" "}
                {alert.location.district}
              </span>

              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />

                {new Date(
                  alert.createdAt
                ).toLocaleString("en-GB")}
              </span>

              <span>
                {alertTypeLabels[alert.type]}
              </span>
            </div>

            {alert.status === "resolved" && (
              <div className="space-y-1 rounded-lg bg-emerald-500/5 p-3">
                <p className="text-xs font-medium text-emerald-600">
                  Resolved by {alert.resolvedByName}
                </p>

                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {alert.resolutionNotes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {canViewSource && (
                <Link href={sourceHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  View Source
                  <ArrowUpRight className="size-3.5" />
                </Link>
              )}

              {!alert.isRead && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() => onRead(alert._id)}
                >
                  <CheckCheck className="size-4" />
                  Mark as Read
                </Button>
              )}

              {canManage && alert.status === "active" && (
                <Button
                  size="sm"
                  disabled={updating}
                  onClick={() => onResolve(alert)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CircleCheck className="size-4" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
        <ActivityHistory kind="alert" id={alert._id} />
      </CardContent>
    </Card>
  );
}