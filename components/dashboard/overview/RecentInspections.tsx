import Link from "next/link";

import {
  ClipboardList,
  ArrowUpRight,
  MapPin,
  Eye,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type {
  RecentInspection,
} from "@/app/types/dashboard";

const statusStyles: Record<string, string> = {
  pending:
    "border-amber-500/20 bg-amber-500/10 text-amber-600",

  under_review:
    "border-blue-500/20 bg-blue-500/10 text-blue-600",

  verified:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",

  rejected:
    "border-red-500/20 bg-red-500/10 text-red-600",
};

const resultStyles: Record<string, string> = {
  positive:
    "border-red-500/20 bg-red-500/10 text-red-600",

  negative:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",

  inconclusive:
    "border-amber-500/20 bg-amber-500/10 text-amber-600",
};

export default function RecentInspections({
  data,
}: {
  data: RecentInspection[];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Recent Inspections
            </CardTitle>

            <CardDescription className="mt-1">
              Latest surveillance records.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/inspections" />}
          >
            View All
              <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 text-center">
            <ClipboardList className="size-10 text-muted-foreground" />

            <p className="font-medium">
              No inspections found
            </p>

            <p className="text-sm text-muted-foreground">
              No records in the selected date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Verified Result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((inspection) => (
                  <TableRow key={inspection._id}>
                    <TableCell>
                      <p
                        className="max-w-[140px] truncate font-medium"
                        title={inspection.inspectionId}
                      >
                        {inspection.inspectionId}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {inspection.inspectorName}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />

                        <span>
                          {inspection.district}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {inspection.area}
                      </p>
                    </TableCell>

                    <TableCell>
                      {inspection.detectionResult ? (
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            resultStyles[
                              inspection.detectionResult
                            ]
                          }`}
                        >
                          {inspection.detectionResult}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not verified
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${
                          statusStyles[
                            inspection.status
                          ]
                        }`}
                      >
                        {inspection.status.replaceAll(
                          "_",
                          " "
                        )}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(
                        inspection.inspectedAt
                      ).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Dhaka",
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        nativeButton={false}
                        render={<Link
                          href={`/inspections/${inspection._id}`}
                          aria-label="View inspection"
                         />}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}