import { Check, X, ShieldCheck } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { hasPermission } from "@/lib/permissions";
import { userRoles } from "@/app/constants/administration";

import type { Permission } from "@/app/types/auth";

const permissions: {
  label: string;
  value: Permission;
}[] = [
  {
    label: "View Dashboard",
    value: "dashboard:view",
  },
  {
    label: "View Inspections",
    value: "inspections:view",
  },
  {
    label: "Create Inspections",
    value: "inspections:create",
  },
  {
    label: "Update Inspections",
    value: "inspections:update",
  },
  {
    label: "Delete Inspections",
    value: "inspections:delete",
  },
  {
    label: "Geospatial Map",
    value: "map:view",
  },
  {
    label: "AI Review",
    value: "ai:review",
  },
  {
    label: "View Field Operations",
    value: "operations:view",
  },
  {
    label: "Manage Field Operations",
    value: "operations:manage",
  },
  {
    label: "View Alerts",
    value: "alerts:view",
  },
  {
    label: "Manage Alerts",
    value: "alerts:manage",
  },
  {
    label: "Analytics",
    value: "analytics:view",
  },
  {
    label: "View Reports",
    value: "reports:view",
  },
  {
    label: "Generate Reports",
    value: "reports:create",
  },
  {
    label: "Export Reports",
    value: "reports:export",
  },
  {
    label: "Model Evaluation",
    value: "models:evaluate",
  },
  {
    label: "User Management",
    value: "users:manage",
  },
  {
    label: "System Settings",
    value: "settings:manage",
  },
];

export default function RolePermissions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          Role & Permissions
        </CardTitle>

        <CardDescription>
          System access permissions for each user role.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>

                {userRoles.map((role) => (
                  <TableHead
                    key={role.value}
                    className="text-center"
                  >
                    {role.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission.value}>
                  <TableCell className="font-medium">
                    {permission.label}
                  </TableCell>

                  {userRoles.map((role) => (
                    <TableCell
                      key={role.value}
                      className="text-center"
                    >
                      {hasPermission(
                        role.value,
                        permission.value
                      ) ? (
                        <Check
                          aria-label="Allowed"
                          className="mx-auto size-5 text-emerald-600"
                        />
                      ) : (
                        <X
                          aria-label="Denied"
                          className="mx-auto size-4 text-muted-foreground"
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}