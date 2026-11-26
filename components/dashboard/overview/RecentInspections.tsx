import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { recentInspections } from "@/app/constants/dashboard-data";

const statusStyles: Record<string, string> = {
  Positive: "bg-red-500/10 text-red-600 dark:text-red-400",
  Negative: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function RecentInspections() {
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Recent Inspections</CardTitle>
          <CardDescription>
            Latest submitted field inspection records
          </CardDescription>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/inspections">
            View All
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inspection ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>AI Count</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {recentInspections.map((inspection) => (
                <TableRow key={inspection.id}>
                  <TableCell className="font-medium">{inspection.id}</TableCell>

                  <TableCell>{inspection.location}</TableCell>

                  <TableCell>{inspection.container}</TableCell>

                  <TableCell>{inspection.larvae}</TableCell>

                  <TableCell>{inspection.confidence}%</TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-0 ${statusStyles[inspection.status]}`}
                    >
                      {inspection.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {inspection.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
