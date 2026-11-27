import {
  ClipboardList,
  ScanEye,
  UsersRound,
  BellRing,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import type {
  DashboardStatistics,
} from "@/app/types/dashboard";

export default function StatsCards({
  statistics,
  range,
}: {
  statistics: DashboardStatistics;
  range: string;
}) {
  const cards = [
    {
      title: "Total Inspections",
      value: statistics.totalInspections,
      description: `Last ${range} days`,
      icon: ClipboardList,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "Verified Positive Detections",
      value: statistics.verifiedDetections,
      description: `Last ${range} days`,
      icon: ScanEye,
      color: "text-orange-600",
      background: "bg-orange-500/10",
    },
    {
      title: "Active Field Workers",
      value: statistics.activeFieldWorkers,
      description: "Enabled worker accounts",
      icon: UsersRound,
      color: "text-blue-600",
      background: "bg-blue-500/10",
    },
    {
      title: "Active Alerts",
      value: statistics.activeAlerts,
      description: "Currently unresolved alerts",
      icon: BellRing,
      color: "text-red-600",
      background: "bg-red-500/10",
    },
  ].filter((card) => card.value !== null);

  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 ${
        cards.length === 4
          ? "xl:grid-cols-4"
          : cards.length === 3
            ? "xl:grid-cols-3"
            : ""
      }`}
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className="gap-0 py-0"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon
                    className={`size-5 ${card.color}`}
                  />
                </div>
              </div>

              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                {card.value?.toLocaleString()}
              </h2>

              <p className="mt-2 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}