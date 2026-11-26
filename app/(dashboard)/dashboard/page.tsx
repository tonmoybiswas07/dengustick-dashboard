import { LayoutDashboard, CalendarDays } from "lucide-react";

import StatsCards from "@/components/dashboard/overview/StatsCards";
import InspectionChart from "@/components/dashboard/overview/InspectionChart";
import DetectionChart from "@/components/dashboard/overview/DetectionChart";
import RecentInspections from "@/components/dashboard/overview/RecentInspections";
import PriorityAlerts from "@/components/dashboard/overview/PriorityAlerts";

import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <LayoutDashboard size={26} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Surveillance Overview
              </h1>

              <Badge variant="secondary">
                Demo Data
              </Badge>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Monitor mosquito breeding sites, inspections
              and AI detection activity.
            </p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
          <CalendarDays size={16} />
          Last 7 days
        </div>
      </div>

      <StatsCards />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <InspectionChart />
        </div>

        <DetectionChart />
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="min-w-0 2xl:col-span-2">
          <RecentInspections />
        </div>

        <PriorityAlerts />
      </div>
    </section>
  );
}