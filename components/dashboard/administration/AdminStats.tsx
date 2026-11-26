import {
  Users,
  UserCheck,
  UserX,
  HardHat,
  MapPin,
  MapPinned,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type {
  AdminStatistics,
} from "@/app/types/administration";

export default function AdminStats({
  stats,
}: {
  stats: AdminStatistics;
}) {
  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-teal-600",
      background: "bg-teal-500/10",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: UserCheck,
      color: "text-emerald-600",
      background: "bg-emerald-500/10",
    },
    {
      title: "Inactive Users",
      value: stats.inactiveUsers,
      icon: UserX,
      color: "text-red-600",
      background: "bg-red-500/10",
    },
    {
      title: "Field Workers",
      value: stats.fieldWorkers,
      icon: HardHat,
      color: "text-blue-600",
      background: "bg-blue-500/10",
    },
    {
      title: "Total Regions",
      value: stats.totalRegions,
      icon: MapPin,
      color: "text-amber-600",
      background: "bg-amber-500/10",
    },
    {
      title: "Active Regions",
      value: stats.activeRegions,
      icon: MapPinned,
      color: "text-violet-600",
      background: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="gap-0 py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {card.title}
                </p>

                <div
                  className={`flex size-11 items-center justify-center rounded-xl ${card.background}`}
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