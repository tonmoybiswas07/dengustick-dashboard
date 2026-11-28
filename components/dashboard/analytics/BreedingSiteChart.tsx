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

import type { BreedingSiteAnalytics } from "@/app/types/analytics";

export default function BreedingSiteChart({
  data,
}: {
  data: BreedingSiteAnalytics[];
}) {
  const chartData = data.map((item) => ({
    ...item,
    name: item.type
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" "),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Breeding Site Analysis</CardTitle>

        <CardDescription>
          Inspection volume by breeding site category
        </CardDescription>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No breeding site data available.
          </div>
        ) : (
          <div className="h-80 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 15,
                  left: 5,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--border)"
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={105}
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
                  name="Inspections"
                  fill="var(--chart-1)"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={20}
                />

                <Bar
                  isAnimationActive={false}
                  dataKey="positive"
                  name="Verified Positive"
                  fill="var(--chart-3)"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}