"use client";

import Link from "next/link";
import {
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasPermission } from "@/lib/permissions";
import type { InspectionDTO } from "@/app/types/inspection";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InspectionTableProps {
  inspections: InspectionDTO[];
  role: string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (inspection: InspectionDTO) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  pending: "bg-amber-500/10 text-amber-600",
  under_review: "bg-blue-500/10 text-blue-600",
  verified: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
};

const detectionColors = {
  positive: "bg-red-500/10 text-red-600",
  negative: "bg-emerald-500/10 text-emerald-600",
  inconclusive: "bg-slate-500/10 text-slate-500",
};

export default function InspectionTable({
  inspections,
  role,
  page,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: InspectionTableProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Inspection ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Inspector</TableHead>
              <TableHead>AI Prediction</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {inspections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-16">
                    <ClipboardList className="size-12 text-muted-foreground" />
                    <h3 className="font-semibold">
                      No inspections found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No matching inspection records are available.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              inspections.map((inspection) => (
                <TableRow key={inspection._id}>
                  <TableCell className="font-medium">
                    {inspection.inspectionId.slice(0, 15)}
                  </TableCell>

                  <TableCell>
                    <p className="font-medium">
                      {inspection.location.area}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.location.district}
                    </p>
                  </TableCell>

                  <TableCell>
                    {inspection.inspectorName}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${detectionColors[inspection.detectionResult]}`}
                    >
                      {inspection.detectionResult}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`capitalize ${statusColors[inspection.status]}`}
                    >
                      {inspection.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {new Date(
                      inspection.inspectedAt
                    ).toLocaleDateString("en-GB")}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Inspection actions"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem nativeButton={false} render={<Link href={`/inspections/${inspection._id}`} />}>
                          <Eye className="size-4" />
                          View Details
                        </DropdownMenuItem>

                        {hasPermission(
                          role,
                          "inspections:update"
                        ) && (
                          <DropdownMenuItem
                            onClick={() => onEdit(inspection)}
                          >
                            <Pencil className="size-4" />
                            Edit Inspection
                          </DropdownMenuItem>
                        )}

                        {hasPermission(
                          role,
                          "inspections:delete"
                        ) && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (inspection._id) {
                                onDelete(inspection._id);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
        <p className="text-sm text-muted-foreground">
          {total} inspections found
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-sm">
            Page {page} of {Math.max(1, totalPages)}
          </span>

          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}