"use client";

import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MapFiltersProps {
  search: string;
  district: string;
  detection: string;
  districts: string[];
  onSearchChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onDetectionChange: (value: string) => void;
  onReset: () => void;
}

export default function MapFilters({
  search,
  district,
  detection,
  districts,
  onSearchChange,
  onDistrictChange,
  onDetectionChange,
  onReset,
}: MapFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search location..."
          className="h-10 pl-9"
        />
      </div>

      <Select value={district} onValueChange={(value) => { if (value !== null) onDistrictChange(value); }}>
        <SelectTrigger className="h-10 w-full lg:w-48">
          <SelectValue placeholder="All Districts" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All Districts</SelectItem>

          {districts.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={detection} onValueChange={(value) => { if (value !== null) onDetectionChange(value); }}>
        <SelectTrigger className="h-10 w-full lg:w-48">
          <SelectValue placeholder="All AI Predictions" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All AI Predictions</SelectItem>
          <SelectItem value="positive">Positive</SelectItem>
          <SelectItem value="negative">Negative</SelectItem>
          <SelectItem value="inconclusive">Inconclusive</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        className="h-10"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Reset
      </Button>
    </div>
  );
}