"use client";

import {
  CalendarDays,
  MapPin,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsFiltersProps {
  range: string;
  district: string;
  districts: string[];
  onRangeChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onReset: () => void;
}

export default function AnalyticsFilters({
  range,
  district,
  districts,
  onRangeChange,
  onDistrictChange,
  onReset,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={range}
        onValueChange={(value) => { if (value !== null) onRangeChange(value); }}
      >
        <SelectTrigger className="w-full sm:w-48">
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

          <SelectItem value="365">
            Last 365 Days
          </SelectItem>

          <SelectItem value="all">
            All Time
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={district}
        onValueChange={(value) => { if (value !== null) onDistrictChange(value); }}
      >
        <SelectTrigger className="w-full sm:w-48">
          <MapPin className="size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">
            All Districts
          </SelectItem>

          {districts.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={onReset}
        disabled={
          range === "30" && district === "all"
        }
      >
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </div>
  );
}