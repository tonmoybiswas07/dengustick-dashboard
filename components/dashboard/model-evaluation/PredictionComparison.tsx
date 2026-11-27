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

import { GitCompareArrows } from "lucide-react";

import type {
  PredictionComparisonData,
} from "@/app/types/model-evaluation";

export default function PredictionComparison({
  data,
}: {
  data: PredictionComparisonData[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="size-5 text-primary" />
          Prediction Comparison
        </CardTitle>

        <CardDescription>
          AI predictions versus manually verified results.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={data}
              barGap={8}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
              />

              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
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
                dataKey="ai"
                name="AI Prediction"
                fill="#0d9488"
                radius={[6, 6, 0, 0]}
                maxBarSize={65}
              />

              <Bar
                dataKey="manual"
                name="Manual Verification"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={65}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}