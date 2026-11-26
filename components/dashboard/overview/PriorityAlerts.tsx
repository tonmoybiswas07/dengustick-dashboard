import Link from "next/link";
import { TriangleAlert, Clock3, MapPin, ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { priorityAlerts } from "@/app/constants/dashboard-data";

export default function PriorityAlerts() {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Priority Alerts</CardTitle>
          <CardDescription>Findings requiring attention</CardDescription>
        </div>

        <Link href="/alerts" aria-label="View all alerts" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowUpRight size={18} />
        </Link>
      </CardHeader>

      <CardContent className="space-y-3">
        {priorityAlerts.map((alert) => {
          const isHigh = alert.priority === "High";
          const Icon = isHigh ? TriangleAlert : Clock3;

          return (
            <div
              key={alert.id}
              className="rounded-xl border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 rounded-lg p-2 ${
                    isHigh
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{alert.title}</h3>

                    <Badge
                      variant="outline"
                      className={
                        isHigh
                          ? "border-red-500/20 text-red-500"
                          : "border-amber-500/20 text-amber-500"
                      }
                    >
                      {alert.priority}
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.description}
                  </p>

                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={12} />
                    {alert.location}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
