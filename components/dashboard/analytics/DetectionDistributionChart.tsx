"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type { DetectionDistribution } from "@/app/types/analytics";

const colors: Record<string, string> = {
  Positive: "#ef4444",
  Negative: "#10b981",
  Inconclusive: "#f59e0b",
};

export default function DetectionDistributionChart({
  data,
}: {
  data: DetectionDistribution[];
}) {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection Distribution</CardTitle>

        <CardDescription>
          Manually verified detection results
        </CardDescription>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No verified detections available.
          </div>
        ) : (
          <>
            <div className="relative h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.filter(
                      (item) => item.value > 0
                    )}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data
                      .filter((item) => item.value > 0)
                      .map((item) => (
                        <Cell
                          key={item.name}
                          fill={
                            colors[item.name] ??
                            "#64748b"
                          }
                        />
                      ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "10px",
                    }}
                    itemStyle={{
                      color: "var(--foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">
                  {total.toLocaleString()}
                </span>

                <span className="text-xs text-muted-foreground">
                  Results
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{
                        backgroundColor: colors[item.name],
                      }}
                    />

                    <span className="text-sm">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {item.value}
                    </span>

                    <span className="w-14 text-right text-xs text-muted-foreground">
                      {(
                        (item.value / total) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}