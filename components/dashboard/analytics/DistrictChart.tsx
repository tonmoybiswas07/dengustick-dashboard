"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

import type { DistrictAnalytics } from "@/app/types/analytics";

export default function DistrictChart({
  data,
}: {
  data: DistrictAnalytics[];
}) {
  const chartData = data.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>District-wise Surveillance</CardTitle>

        <CardDescription>
          {chartData.length
            ? `Top ${chartData.length} districts by inspection volume. ${chartData[0].district} leads with ${chartData[0].total.toLocaleString()} inspections.`
            : "Districts by inspection volume"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No district data available.
          </div>
        ) : (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 25,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />

                <XAxis
                  dataKey="district"
                  tickLine={false}
                  axisLine={false}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  height={55}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: "var(--muted)",
                  }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "10px",
                  }}
                  labelStyle={{
                    color: "var(--foreground)",
                  }}
                />

                <Legend />

                <Bar
                  isAnimationActive={false}
                  dataKey="total"
                  name="Total Inspections"
                  fill="var(--chart-1)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={40}
                />

                <Bar
                  isAnimationActive={false}
                  dataKey="positive"
                  name="Verified Positive"
                  fill="var(--chart-3)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}