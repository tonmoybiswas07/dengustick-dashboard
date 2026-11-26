"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  FilePlus2,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { reportTypes } from "@/app/constants/report";
import { hasPermission } from "@/lib/permissions";

import type { ReportDTO } from "@/app/types/report";

interface GenerateReportFormProps {
  role: string;
  districts: string[];
  onSuccess: (report: ReportDTO) => void;
}

export default function GenerateReportForm({
  role,
  districts,
  onSuccess,
}: GenerateReportFormProps) {
  const today = new Date(
    Date.now() + 6 * 3600000
  )
    .toISOString()
    .slice(0, 10);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "surveillance_summary",
    startDate: `${today.slice(0, 7)}-01`,
    endDate: today,
    district: "all",
  });

  const availableTypes = reportTypes.filter(
    (item) =>
      item.value !== "field_operations" ||
      hasPermission(role, "operations:manage")
  );

  function updateField(
    key: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await fetch("/api/reports", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);

      setForm((previous) => ({
        ...previous,
        title: "",
      }));

      onSuccess(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate report"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FilePlus2 className="size-5 text-primary" />
          Generate New Report
        </CardTitle>

        <CardDescription>
          Create a report using verified surveillance data
          and field operation records.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reportTitle">
                Report Title
              </Label>

              <Input
                id="reportTitle"
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="Monthly Surveillance Report"
                minLength={3}
                maxLength={150}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>

              <Select
                value={form.type}
                onValueChange={(value) =>
                  updateField("type", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {availableTypes.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Start Date
              </Label>

              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                max={form.endDate}
                onChange={(e) =>
                  updateField(
                    "startDate",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date
              </Label>

              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate}
                max={today}
                onChange={(e) =>
                  updateField(
                    "endDate",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>District</Label>

              <Select
                value={form.district}
                onValueChange={(value) =>
                  updateField("district", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Districts
                  </SelectItem>

                  {districts.map((district) => (
                    <SelectItem
                      key={district}
                      value={district}
                    >
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FilePlus2 className="size-4" />
              )}

              Generate Report
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}