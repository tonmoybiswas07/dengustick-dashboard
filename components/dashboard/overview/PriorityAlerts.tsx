import Link from "next/link";

import {
  BellRing,
  ArrowUpRight,
  TriangleAlert,
  ShieldCheck,
  MapPin,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type {
  PriorityAlert,
} from "@/app/types/dashboard";

const severityStyles: Record<string, string> = {
  critical:
    "border-red-500/20 bg-red-500/10 text-red-600",

  high:
    "border-orange-500/20 bg-orange-500/10 text-orange-600",

  medium:
    "border-amber-500/20 bg-amber-500/10 text-amber-600",

  low:
    "border-blue-500/20 bg-blue-500/10 text-blue-600",
};

export default function PriorityAlerts({
  data,
}: {
  data: PriorityAlert[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-5 text-primary" />
              Priority Alerts
            </CardTitle>

            <CardDescription className="mt-1">
              High-priority operational notifications.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/alerts" />}
          >
            View All
              <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheck className="size-7 text-emerald-600" />
            </div>

            <p className="font-medium">
              No priority alerts
            </p>

            <p className="text-sm text-muted-foreground">
              No active high or critical alerts recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((alert) => (
              <div
                key={alert._id}
                className="flex items-start gap-3 rounded-xl border p-4"
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    alert.severity === "critical"
                      ? "bg-red-500/10 text-red-600"
                      : "bg-orange-500/10 text-orange-600"
                  }`}
                >
                  <TriangleAlert className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {alert.title}
                    </h3>

                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        severityStyles[alert.severity]
                      }`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {alert.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {alert.area}, {alert.district}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {new Date(
                        alert.createdAt
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Dhaka",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}