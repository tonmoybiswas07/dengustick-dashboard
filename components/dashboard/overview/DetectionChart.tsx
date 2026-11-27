"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  ChartPie,
  Database,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type {
  DetectionDistribution,
} from "@/app/types/dashboard";

const colors: Record<string, string> = {
  Positive: "#ef4444",
  Negative: "#0d9488",
  Inconclusive: "#f59e0b",
};

export default function DetectionChart({
  data,
}: {
  data: DetectionDistribution[];
}) {
  const total = data.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartPie className="size-5 text-primary" />
          Detection Distribution
        </CardTitle>

        <CardDescription>
          Manually verified detection results.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
            <Database className="size-10 text-muted-foreground" />

            <p className="font-medium">
              No verified detections
            </p>

            <p className="text-sm text-muted-foreground">
              Verified results will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="relative h-[220px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.map((item) => (
                      <Cell
                        key={item.name}
                        fill={
                          colors[item.name] ??
                          "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      color: "var(--foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold">
                  {total}
                </p>

                <p className="text-xs text-muted-foreground">
                  Verified Results
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{
                        backgroundColor:
                          colors[item.name],
                      }}
                    />

                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {item.value}
                    </span>

                    <span className="w-12 text-right text-xs text-muted-foreground">
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