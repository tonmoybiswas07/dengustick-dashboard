"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { inspectionTrends } from "@/app/constants/dashboard-data";

const chartConfig = {
  inspections: {
    label: "Inspections",
    color: "var(--chart-1)",
  },
  positive: {
    label: "Positive Findings",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export default function InspectionChart() {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader>
        <CardTitle>Inspection Trends</CardTitle>
        <CardDescription>
          Daily inspections and verified positive findings
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={inspectionTrends}
            margin={{ left: -15, right: 5 }}
          >
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />

            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />

            <ChartTooltip content={<ChartTooltipContent />} />

            <ChartLegend content={<ChartLegendContent />} />

            <Bar
              dataKey="inspections"
              fill="var(--color-inspections)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />

            <Bar
              dataKey="positive"
              fill="var(--color-positive)"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
