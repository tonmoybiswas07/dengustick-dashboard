"use client";

import { Search, ListFilter, RotateCcw } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { inspectionStatuses } from "@/app/constants/inspection";

interface InspectionFiltersProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

export default function InspectionFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onReset,
}: InspectionFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search inspections..."
          aria-label="Search inspections"
          className="h-10 pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger
          aria-label="Filter by status"
          className="h-10 w-full sm:w-45"
        >
          <ListFilter className="size-4" />
          <SelectValue placeholder="All Status" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">
            All Status
          </SelectItem>

          {inspectionStatuses.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={onReset}
        disabled={!search && status === "all"}
        className="h-10"
      >
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </div>
  );
}