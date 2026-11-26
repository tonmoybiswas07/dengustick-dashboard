import {
  BellRing,
  Mail,
  Activity,
  TriangleAlert,
  CircleCheck,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { AlertStatistics } from "@/app/types/alert";

export default function AlertStats({
  stats,
}: {
  stats: AlertStatistics;
}) {
  const cards = [
    {
      title: "Total Alerts",
      value: stats.total,
      icon: BellRing,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "Unread",
      value: stats.unread,
      icon: Mail,
      color: "text-blue-600",
      background: "bg-blue-500/10",
    },
    {
      title: "Active Alerts",
      value: stats.active,
      icon: Activity,
      color: "text-amber-600",
      background: "bg-amber-500/10",
    },
    {
      title: "High Priority",
      value: stats.highPriority,
      icon: TriangleAlert,
      color: "text-red-600",
      background: "bg-red-500/10",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CircleCheck,
      color: "text-emerald-600",
      background: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
              </div>

              <h3 className="mt-4 text-3xl font-bold">
                {card.value}
              </h3>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}