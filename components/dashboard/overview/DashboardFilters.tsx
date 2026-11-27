"use client";

import {
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardFiltersProps {
  range: string;
  loading: boolean;
  onRangeChange: (value: string) => void;
  onRefresh: () => void;
}

export default function DashboardFilters({
  range,
  loading,
  onRangeChange,
  onRefresh,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={range}
        onValueChange={(value) => { if (value !== null) onRangeChange(value); }}
      >
        <SelectTrigger className="w-[165px]">
          <CalendarDays className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="7">
            Last 7 Days
          </SelectItem>

          <SelectItem value="30">
            Last 30 Days
          </SelectItem>

          <SelectItem value="90">
            Last 90 Days
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw
          className={`size-4 ${
            loading ? "animate-spin" : ""
          }`}
        />

        Refresh
      </Button>
    </div>
  );
}