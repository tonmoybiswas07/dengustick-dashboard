import {
  ScanEye,
  Clock3,
  ShieldCheck,
  CircleX,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ReviewStatistics } from "@/app/types/review";

export default function ReviewStats({
  stats,
}: {
  stats: ReviewStatistics;
}) {
  const cards = [
    {
      title: "Total Inspections",
      value: stats.total,
      icon: ScanEye,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "Awaiting Review",
      value: stats.pending,
      icon: Clock3,
      color: "text-amber-600",
      background: "bg-amber-500/10",
    },
    {
      title: "Verified",
      value: stats.verified,
      icon: ShieldCheck,
      color: "text-emerald-600",
      background: "bg-emerald-500/10",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: CircleX,
      color: "text-red-600",
      background: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  className={`flex size-11 items-center justify-center rounded-xl ${card.background}`}
                >
                  <Icon className={`size-5 ${card.color}`} />
                </div>
              </div>

              <h3 className="mt-3 text-3xl font-bold">
                {card.value.toLocaleString()}
              </h3>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}