import {
  MapPin,
  CircleAlert,
  CircleCheck,
  CircleHelp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MapInspection } from "@/app/types/map";

export default function MapStats({
  inspections,
}: {
  inspections: MapInspection[];
}) {
  const cards = [
    {
      title: "Mapped Inspections",
      value: inspections.length,
      icon: MapPin,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "AI Positive",
      value: inspections.filter(
        (item) => item.detectionResult === "positive"
      ).length,
      icon: CircleAlert,
      color: "text-red-600",
      background: "bg-red-500/10",
    },
    {
      title: "AI Negative",
      value: inspections.filter(
        (item) => item.detectionResult === "negative"
      ).length,
      icon: CircleCheck,
      color: "text-emerald-600",
      background: "bg-emerald-500/10",
    },
    {
      title: "AI Inconclusive",
      value: inspections.filter(
        (item) => item.detectionResult === "inconclusive"
      ).length,
      icon: CircleHelp,
      color: "text-amber-600",
      background: "bg-amber-500/10",
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