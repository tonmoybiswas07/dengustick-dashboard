import { MapPin, Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import type {
  RegionDTO,
} from "@/app/types/administration";

export default function RegionTable({
  regions,
  onEdit,
}: {
  regions: RegionDTO[];
  onEdit: (region: RegionDTO) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Region</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {regions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center gap-3 py-16">
                    <MapPin className="size-10 text-muted-foreground" />
                    <p>No regions created yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              regions.map((region) => (
                <TableRow key={region._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="size-5 text-primary" />
                      </div>

                      <div>
                        <p className="font-medium">
                          {region.name}
                        </p>

                        <p className="max-w-48 truncate text-xs text-muted-foreground">
                          {region.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>{region.code}</TableCell>

                  <TableCell>{region.district}</TableCell>

                  <TableCell>{region.division}</TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        region.isActive
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-600"
                      }
                    >
                      {region.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit region"
                      onClick={() => onEdit(region)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}