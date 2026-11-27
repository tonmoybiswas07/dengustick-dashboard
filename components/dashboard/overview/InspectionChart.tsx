"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { ChartNoAxesCombined } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import type {
  InspectionTrend,
} from "@/app/types/dashboard";

function formatDate(value: string) {
  return new Date(
    `${value}T00:00:00Z`
  ).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function InspectionChart({
  data,
}: {
  data: InspectionTrend[];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartNoAxesCombined className="size-5 text-primary" />
          Inspection Trends
        </CardTitle>

        <CardDescription>
          Daily inspection and verification activities.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="inspectionGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#0d9488"
                    stopOpacity={0.3}
                  />

                  <stop
                    offset="95%"
                    stopColor="#0d9488"
                    stopOpacity={0}
                  />
                </linearGradient>

                <linearGradient
                  id="verifiedGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.2}
                  />

                  <stop
                    offset="95%"
                    stopColor="#6366f1"
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
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={false}
                minTickGap={25}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={35}
                stroke="var(--muted-foreground)"
              />

              <Tooltip
                labelFormatter={(value) =>
                  formatDate(String(value))
                }
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />

              <Legend />

              <Area
                type="monotone"
                dataKey="inspections"
                name="Total Inspections"
                stroke="#0d9488"
                strokeWidth={2.5}
                fill="url(#inspectionGradient)"
              />

              <Area
                type="monotone"
                dataKey="verified"
                name="Verified Inspections"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#verifiedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}