import { Pencil, UsersRound } from "lucide-react";

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

import {
  roleLabels,
  roleColors,
} from "@/app/constants/administration";

import type {
  AdminUser,
  RegionDTO,
} from "@/app/types/administration";

interface UserTableProps {
  users: AdminUser[];
  regions: RegionDTO[];
  currentUserId: string;
  onEdit: (user: AdminUser) => void;
}

export default function UserTable({
  users,
  regions,
  currentUserId,
  onEdit,
}: UserTableProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center gap-3 py-16">
                    <UsersRound className="size-10 text-muted-foreground" />
                    <p>No users found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div>
                        <p className="font-medium">
                          {user.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleColors[user.role]}
                    >
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {user.role === "admin"
                      ? "All Regions"
                      : regions.find(
                          (region) =>
                            region._id === user.regionId
                        )?.name ??
                        user.regionId ??
                        "Not Assigned"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.banned
                          ? "bg-red-500/10 text-red-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }
                    >
                      {user.banned ? "Inactive" : "Active"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {new Date(
                      user.createdAt
                    ).toLocaleDateString("en-GB")}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit user"
                      disabled={
                        user.role === "admin" ||
                        user._id === currentUserId
                      }
                      onClick={() => onEdit(user)}
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