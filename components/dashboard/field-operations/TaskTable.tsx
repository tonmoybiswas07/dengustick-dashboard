"use client";

import Link from "next/link";

import {
  MoreHorizontal,
  Play,
  CircleCheck,
  CircleX,
  ClipboardList,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

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

import {
  priorityColors,
  taskStatusColors,
} from "@/app/constants/field-operation";

import type {
  FieldTaskDTO,
  TaskStatus,
} from "@/app/types/field-operation";

interface TaskTableProps {
  tasks: FieldTaskDTO[];
  canManage: boolean;
  canUpdate: boolean;
  onUpdate: (
    task: FieldTaskDTO,
    status: TaskStatus
  ) => void;
}

export default function TaskTable({
  tasks,
  canManage,
  canUpdate,
  onUpdate,
}: TaskTableProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Task</TableHead>
              <TableHead>Field Worker</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center gap-3 py-16">
                    <ClipboardList className="size-12 text-muted-foreground" />

                    <h3 className="font-semibold">
                      No tasks found
                    </h3>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {

                return (
                  <TableRow key={task._id}>
                    <TableCell>
                      <p className="font-medium">
                        {task.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {task.taskId.slice(0, 13)}
                      </p>
                    </TableCell>

                    <TableCell>
                      {task.assignedToName}
                    </TableCell>

                    <TableCell>
                      <p>{task.location.area}</p>

                      <p className="text-xs text-muted-foreground">
                        {task.location.district}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${priorityColors[task.priority]}`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <p>
                        {new Date(
                          task.deadline
                        ).toLocaleDateString("en-GB")}
                      </p>

                      {task.isOverdue && (
                        <span className="text-xs text-red-600">
                          Overdue
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${taskStatusColors[task.status]}`}
                      >
                        {task.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {task.inspectionId ? (
                        <Link href={`/inspections/${task.inspectionId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Inspection
                        </Link>
                      ) : canUpdate &&
                        ["assigned", "in_progress"].includes(
                          task.status
                        ) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Task actions"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            {task.status === "assigned" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onUpdate(task, "in_progress")
                                }
                              >
                                <Play className="size-4" />
                                Start Task
                              </DropdownMenuItem>
                            )}

                            {task.status === "in_progress" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onUpdate(task, "completed")
                                }
                              >
                                <CircleCheck className="size-4" />
                                Complete Task
                              </DropdownMenuItem>
                            )}

                            {canManage && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  onUpdate(task, "cancelled")
                                }
                              >
                                <CircleX className="size-4" />
                                Cancel Task
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}