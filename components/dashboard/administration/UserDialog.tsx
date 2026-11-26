"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

import { userRoles } from "@/app/constants/administration";

import type {
  AdminUser,
  RegionDTO,
} from "@/app/types/administration";

interface UserDialogProps {
  user: AdminUser | null;
  regions: RegionDTO[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserDialog({
  user,
  regions,
  onClose,
  onSuccess,
}: UserDialogProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "field_worker",
    regionId: user?.regionId ?? "",
    banned: user?.banned ?? false,
  });

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      form.role !== "admin" &&
      !form.regionId
    ) {
      toast.error("Please select a region");
      return;
    }

    try {
      setLoading(true);

      const commonData = {
        name: form.name,
        role: form.role,

        regionId:
          form.role === "admin"
            ? null
            : form.regionId,
      };

      const body = user
        ? {
            ...commonData,
            banned: form.banned,
          }
        : {
            ...commonData,
            email: form.email,
            password: form.password,
          };

      const response = await fetch(
        user
          ? `/api/administration/users/${user._id}`
          : "/api/administration/users",

        {
          method: user ? "PATCH" : "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(body),
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
          : "Failed to save user"
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
            {user ? "Edit User" : "Create New User"}
          </DialogTitle>

          <DialogDescription>
            Configure account information and access permissions.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="userName">Full Name</Label>

            <Input
              id="userName"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userEmail">Email</Label>

            <Input
              id="userEmail"
              type="email"
              value={form.email}
              readOnly={Boolean(user)}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              required
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="userPassword">
                Initial Password
              </Label>

              <Input
                id="userPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={form.password}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>User Role</Label>

            <Select<typeof form.role>
              value={form.role}
              onValueChange={(role) => {
                if (role !== null) setForm((previous) => ({ ...previous, role }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {userRoles
                  .filter(
                    (role) =>
                      !user || role.value !== "admin"
                  )
                  .map((role) => (
                    <SelectItem
                      key={role.value}
                      value={role.value}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {form.role !== "admin" && (
            <div className="space-y-2">
              <Label>Assigned Region</Label>

              <Select
                value={form.regionId}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    regionId: value ?? "",
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>

                <SelectContent>
                  {regions
                    .filter((region) => region.isActive)
                    .map((region) => (
                      <SelectItem
                        key={region._id}
                        value={region._id}
                      >
                        {region.name} — {region.district}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {user && (
            <div className="space-y-2">
              <Label>Account Status</Label>

              <Select
                value={
                  form.banned ? "inactive" : "active"
                }
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    banned: value === "inactive",
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
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}

              {user ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}