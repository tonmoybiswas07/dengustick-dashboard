import { ClipboardList, MapPinned, Clock3, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardStats } from "@/app/constants/dashboard-data";

const stats = [
  {
    title: "Total Inspections",
    value: dashboardStats.totalInspections,
    icon: ClipboardList,
    color: "text-teal-600 dark:text-teal-400",
    background: "bg-teal-500/10",
    description: "All recorded inspections",
  },
  {
    title: "Positive Sites",
    value: dashboardStats.positiveSites,
    icon: MapPinned,
    color: "text-red-600 dark:text-red-400",
    background: "bg-red-500/10",
    description: "Verified larvae-positive sites",
  },
  {
    title: "Pending Reviews",
    value: dashboardStats.pendingReviews,
    icon: Clock3,
    color: "text-amber-600 dark:text-amber-400",
    background: "bg-amber-500/10",
    description: "Awaiting expert verification",
  },
  {
    title: "Active Inspectors",
    value: dashboardStats.activeInspectors,
    icon: UsersRound,
    color: "text-blue-600 dark:text-blue-400",
    background: "bg-blue-500/10",
    description: "Active field personnel",
  },
];

export default function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card
            key={stat.title}
            className="gap-0 py-0 shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>

                <div
                  className={`rounded-xl p-3 ${stat.background} ${stat.color}`}
                >
                  <Icon size={21} />
                </div>
              </div>

              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                {stat.value.toLocaleString("en-US")}
              </h2>

              <p className="mt-2 text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
