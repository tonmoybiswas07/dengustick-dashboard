import { UsersRound } from "lucide-react";

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

import type { WorkerPerformance } from "@/app/types/analytics";

export default function WorkerPerformanceTable({
  workers,
}: {
  workers: WorkerPerformance[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="size-5 text-primary" />
          Inspector Activity
        </CardTitle>

        <CardDescription>
          Inspection volume and verification progress by inspector
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspector</TableHead>

                <TableHead className="text-center">
                  Total Inspections
                </TableHead>

                <TableHead className="text-center">
                  Verified
                </TableHead>

                <TableHead className="text-center">
                  Positive
                </TableHead>

                <TableHead>
                  Verification Rate
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {workers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No inspector activity available.
                  </TableCell>
                </TableRow>
              ) : (
                workers.map((worker) => (
                  <TableRow key={worker.inspectorId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {worker.inspectorName
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <span className="font-medium">
                          {worker.inspectorName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      {worker.totalInspections}
                    </TableCell>

                    <TableCell className="text-center text-emerald-600">
                      {worker.verifiedInspections}
                    </TableCell>

                    <TableCell className="text-center text-amber-600">
                      {worker.positiveDetections}
                    </TableCell>

                    <TableCell>
                      <div className="flex min-w-32 items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${worker.verificationRate}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-semibold">
                          {worker.verificationRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}