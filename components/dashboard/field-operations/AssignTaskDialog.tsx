"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { taskPriorities } from "@/app/constants/field-operation";
import type { FieldWorker } from "@/app/types/field-operation";

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: FieldWorker[];
  onSuccess: () => void;
}

export default function AssignTaskDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: AssignTaskDialogProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    address: "",
    district: "",
    area: "",
    priority: "medium",
    deadline: "",
  });

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

    if (!form.assignedTo) {
      toast.error("Select a field worker");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/field-operations/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            assignedTo: form.assignedTo,

            location: {
              address: form.address,
              district: form.district,
              area: form.area,
            },

            priority: form.priority,
            deadline: new Date(
              form.deadline
            ).toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success("Task assigned successfully");

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to assign task"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Field Task</DialogTitle>

          <DialogDescription>
            Create a surveillance task for a field worker.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>

            <Input
              id="title"
              value={form.title}
              onChange={(e) =>
                updateField("title", e.target.value)
              }
              placeholder="Mosquito breeding site inspection"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Task Description
            </Label>

            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                updateField("description", e.target.value)
              }
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Assign Field Worker</Label>

            <Select
              value={form.assignedTo}
              onValueChange={(value) =>
                updateField("assignedTo", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select field worker" />
              </SelectTrigger>

              <SelectContent>
                {workers
                  .filter((worker) => worker.regionId)
                  .map((worker) => (
                    <SelectItem
                      key={worker.id}
                      value={worker.id}
                    >
                      {worker.name} — {worker.regionId} (
                      {worker.activeTasks} active)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {!workers.some((worker) => worker.regionId) && (
              <p className="text-xs text-destructive">
                No field worker with an assigned region is available.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>

              <Input
                id="district"
                value={form.district}
                onChange={(e) =>
                  updateField("district", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>

              <Input
                id="area"
                value={form.area}
                onChange={(e) =>
                  updateField("area", e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>

            <Input
              id="address"
              value={form.address}
              onChange={(e) =>
                updateField("address", e.target.value)
              }
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>

              <Select
                value={form.priority}
                onValueChange={(value) =>
                  updateField("priority", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {taskPriorities.map((priority) => (
                    <SelectItem
                      key={priority.value}
                      value={priority.value}
                    >
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>

              <Input
                id="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(e) =>
                  updateField("deadline", e.target.value)
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                loading ||
                !workers.some((worker) => worker.regionId)
              }
            >
              {loading && (
                <Loader2 className="size-4 animate-spin" />
              )}

              Assign Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}