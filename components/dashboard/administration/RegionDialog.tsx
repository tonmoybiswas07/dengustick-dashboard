"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Loader2, MapPin } from "lucide-react";
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

import { divisions } from "@/app/constants/administration";

import type {
  RegionDTO,
} from "@/app/types/administration";

export default function RegionDialog({
  region,
  onClose,
  onSuccess,
}: {
  region: RegionDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: region?.name ?? "",
    code: region?.code ?? "",
    district: region?.district ?? "",
    division: region?.division ?? "Rangpur",
    description: region?.description ?? "",
    isActive: region?.isActive ?? true,
  });

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(
        region
          ? `/api/administration/regions/${region._id}`
          : "/api/administration/regions",

        {
          method: region ? "PATCH" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(form),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      toast.success(result.message);

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save region"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {region ? "Edit Region" : "Add Region"}
          </DialogTitle>

          <DialogDescription>
            Configure a surveillance region.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="regionName">Region Name</Label>

            <Input
              id="regionName"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="Saidpur Surveillance Zone"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regionCode">Region Code</Label>

            <Input
              id="regionCode"
              value={form.code}
              onChange={(e) =>
                setForm({
                  ...form,
                  code: e.target.value.toUpperCase(),
                })
              }
              placeholder="REG-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">District</Label>

            <Input
              id="district"
              value={form.district}
              onChange={(e) =>
                setForm({
                  ...form,
                  district: e.target.value,
                })
              }
              placeholder="Nilphamari"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Division</Label>

            <Select
              value={form.division}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  division: value ?? "",
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {divisions.map((division) => (
                  <SelectItem
                    key={division}
                    value={division}
                  >
                    {division}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>

            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>

            <Select
              value={
                form.isActive ? "active" : "inactive"
              }
              onValueChange={(value) =>
                setForm({
                  ...form,
                  isActive: value === "active",
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="active">
                  Active
                </SelectItem>

                <SelectItem value="inactive">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              ) : (
                <MapPin className="size-4" />
              )}

              {region ? "Save Changes" : "Create Region"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}