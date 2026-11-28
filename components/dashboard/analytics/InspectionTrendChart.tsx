"use client";

import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type { InspectionTrend } from "@/app/types/analytics";

export default function InspectionTrendChart({
  data,
}: {
  data: InspectionTrend[];
}) {
  const totals = data.reduce((sum, row) => ({
    inspections: sum.inspections + row.inspections,
    verified: sum.verified + row.verified,
    positive: sum.positive + row.positive,
  }), { inspections: 0, verified: 0, positive: 0 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Trends</CardTitle>

        <CardDescription>
          {data.length > 0
            ? `${totals.inspections.toLocaleString()} inspections, ${totals.verified.toLocaleString()} verified, ${totals.positive.toLocaleString()} verified positives`
            : "Surveillance activity and verified detection trends"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No inspection data available.
          </div>
        ) : (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 15,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="analyticsInspectionGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.3}
                    />

                    <stop
                      offset="95%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />

                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                  minTickGap={20}
                />

                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                    borderRadius: "10px",
                  }}
                  labelStyle={{
                    color: "var(--foreground)",
                  }}
                />

                <Legend />

                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="inspections"
                  name="Total Inspections"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#analyticsInspectionGradient)"
                />

                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="verified"
                  name="Verified"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="transparent"
                />

                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="positive"
                  name="Verified Positive"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}