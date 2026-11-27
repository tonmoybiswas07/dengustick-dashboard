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

import { ChartNoAxesCombined } from "lucide-react";

import type {
  ConfidenceDistribution,
} from "@/app/types/model-evaluation";

export default function ConfidenceChart({
  data,
}: {
  data: ConfidenceDistribution[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartNoAxesCombined className="size-5 text-primary" />
          Confidence Distribution
        </CardTitle>

        <CardDescription>
          Correct and incorrect predictions by confidence range.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />

              <XAxis
                dataKey="range"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
                labelStyle={{
                  color: "var(--foreground)",
                }}
              />

              <Legend />

              <Bar
                dataKey="correct"
                name="Correct"
                fill="#0d9488"
                radius={[5, 5, 0, 0]}
              />

              <Bar
                dataKey="incorrect"
                name="Incorrect"
                fill="#ef4444"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}