import {
  ClipboardList,
  Clock3,
  ShieldCheck,
  CircleX,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface InspectionStatsProps {
  stats: {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  };
}

export default function InspectionStats({
  stats,
}: InspectionStatsProps) {
  const cards = [
    {
      title: "Total Inspections",
      value: stats.total,
      description: "All recorded inspections",
      icon: ClipboardList,
      color: "text-teal-600 dark:text-teal-400",
      background: "bg-teal-500/10",
    },
    {
      title: "Pending Review",
      value: stats.pending,
      description: "Awaiting verification",
      icon: Clock3,
      color: "text-amber-600 dark:text-amber-400",
      background: "bg-amber-500/10",
    },
    {
      title: "Verified",
      value: stats.verified,
      description: "Successfully verified",
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      background: "bg-emerald-500/10",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      description: "Rejected inspections",
      icon: CircleX,
      color: "text-red-600 dark:text-red-400",
      background: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
              </div>

              <h3 className="mt-3 text-3xl font-bold tracking-tight">
                {card.value.toLocaleString()}
              </h3>

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