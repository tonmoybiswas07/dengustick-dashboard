"use client";

import { Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { detectionDistribution } from "@/app/constants/dashboard-data";

const chartConfig = {
  value: {
    label: "Inspections",
  },
  Negative: {
    label: "Negative",
    color: "#0d9488",
  },
  Positive: {
    label: "Positive",
    color: "#ef4444",
  },
  Pending: {
    label: "Pending",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

export default function DetectionChart() {
  const total = detectionDistribution.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader>
        <CardTitle>Detection Distribution</CardTitle>
        <CardDescription>
          Inspection outcomes by verification status
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="relative">
          <ChartContainer
            config={chartConfig}
            className="mx-auto h-[220px] w-full"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />

              <Pie
                data={detectionDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={95}
                strokeWidth={3}
                paddingAngle={2}
              />
            </PieChart>
          </ChartContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <h3 className="text-3xl font-bold">
              {total.toLocaleString("en-US")}
            </h3>

            <p className="text-xs text-muted-foreground">Total Inspections</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {detectionDistribution.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />

                <span className="text-sm text-muted-foreground">
                  {item.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{item.value}</span>

                <span className="w-12 text-right text-xs text-muted-foreground">
                  {((item.value / total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
