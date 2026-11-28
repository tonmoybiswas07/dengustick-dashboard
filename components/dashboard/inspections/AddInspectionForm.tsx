"use client";

import InspectionImageUploads from "./InspectionImageUploads";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Combobox } from "@base-ui/react/combobox";
import { loadDirectory } from "@/lib/directory";

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

import { breedingSiteTypes } from "@/app/constants/inspection";
import type { InspectionDTO } from "@/app/types/inspection";

interface AddInspectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  role: string;
  inspection?: InspectionDTO | null;
}

type RegionOption = { id: string; name: string; code: string; district: string };

function regionLabel(region: RegionOption) {
  return `${region.name} · ${region.code} · ${region.district}`;
}

function localDateTime(date: Date) {
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
}

export default function AddInspectionForm({
  open,
  onOpenChange,
  onSuccess,
  role,
  inspection,
}: AddInspectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadsBusy, setUploadsBusy] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [savedImages, setSavedImages] = useState(() => (inspection?.images ?? []).filter((image) => image.startsWith("/api/inspection-images/")));

  const [form, setForm] = useState({
    address: inspection?.location.address ?? "",
    district: inspection?.location.district ?? "",
    area: inspection?.location.area ?? "",
    latitude: String(inspection?.location.latitude ?? ""),
    longitude: String(inspection?.location.longitude ?? ""),
    breedingSiteType:
      inspection?.breedingSiteType ?? "water_container",
    images: (inspection?.images ?? []).filter((image) => !image.startsWith("/api/inspection-images/")).join("\n"),
    notes: inspection?.notes ?? "",
    inspectedAt: localDateTime(
      inspection
        ? new Date(inspection.inspectedAt)
        : new Date()
    ),
  });

  const [regionOptions, setRegionOptions] = useState<RegionOption[]>();
  const [regionError, setRegionError] = useState("");
  const [regionAttempt, setRegionAttempt] = useState(0);
  const [regionChoice, setRegionChoice] = useState(inspection?.regionId ?? "");
  const isAdmin = role === "admin";
  const selectedRegion = isAdmin
    ? regionOptions?.find(({ id }) => id === regionChoice)
    : regionOptions?.[0];
  const selectionLocked = loading || uploadsBusy || uploaded.length > 0;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    loadDirectory<RegionOption>("/api/inspections/regions", controller.signal)
      .then((regions) => {
        if (!controller.signal.aborted) setRegionOptions(regions);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRegionError("Could not load active regions.");
      });
    return () => controller.abort();
  }, [open, regionAttempt]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (uploadsBusy || loading) return;
    if (!selectedRegion) {
      toast.error("Select an active region before saving");
      return;
    }

    if (!form.latitude.trim() || !form.longitude.trim()) {
      toast.error("Location coordinates are required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        regionId: selectedRegion.id,
        location: {
          address: form.address,
          district: form.district,
          area: form.area,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        },
        breedingSiteType: form.breedingSiteType,
        images: [...savedImages, ...uploaded, ...form.images.split("\n").map((image) => image.trim()).filter(Boolean)],
        notes: form.notes,
        inspectedAt: new Date(form.inspectedAt).toISOString(),
      };

      const response = await fetch(
        inspection
          ? `/api/inspections/${inspection._id}`
          : "/api/inspections",
        {
          method: inspection ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to save inspection"
        );
      }

      toast.success(
        inspection
          ? "Inspection updated successfully"
          : "Inspection created successfully"
      );

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {inspection ? "Edit Inspection" : "Add Inspection"}
          </DialogTitle>

          <DialogDescription>
            Record mosquito breeding site and field inspection
            information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inspection-region">Region</Label>
              {regionError ? (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-destructive">{regionError}</p>
                  <Button type="button" variant="outline" onClick={() => {
                    setRegionError("");
                    setRegionAttempt((previous) => previous + 1);
                  }}>Try again</Button>
                </div>
              ) : !regionOptions ? (
                <p role="status" className="text-sm text-muted-foreground">Loading active regions…</p>
              ) : regionOptions.length === 0 ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {isAdmin ? "No active regions are available." : "Your assigned region is unavailable."}
                </p>
              ) : isAdmin ? (
                <>
                  <Combobox.Root items={regionOptions} value={selectedRegion ?? null}
                    itemToStringLabel={regionLabel} itemToStringValue={(region) => region.id}
                    disabled={selectionLocked}
                    onValueChange={(region) => setRegionChoice(region?.id ?? "")}>
                    <Combobox.InputGroup className="relative">
                      <Combobox.Input id="inspection-region" render={<Input className="pr-9" />}
                        placeholder="Search by name, code, or district" />
                      <Combobox.Trigger type="button" aria-label="Show active regions"
                        className="absolute inset-y-0 right-0 grid w-8 place-items-center rounded-r-lg text-muted-foreground">
                        <ChevronDown className="size-4" aria-hidden="true" />
                      </Combobox.Trigger>
                    </Combobox.InputGroup>
                    <Combobox.Portal>
                      <Combobox.Positioner sideOffset={4} className="isolate z-[60] w-(--anchor-width)">
                        <Combobox.Popup className="max-h-[min(16rem,var(--available-height))] overflow-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
                          <Combobox.Empty className="px-2 py-2 text-muted-foreground">No matching active regions.</Combobox.Empty>
                          <Combobox.List>
                            {(region: RegionOption) => (
                              <Combobox.Item key={region.id} value={region} className="flex cursor-default items-start justify-between gap-2 rounded-md px-2 py-2 data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                                <span className="min-w-0 wrap-break-word">
                                  <span className="block font-medium">{region.name}</span>
                                  <span className="block text-xs">{region.code} · {region.district}</span>
                                </span>
                                <Combobox.ItemIndicator><Check className="size-4" aria-hidden="true" /></Combobox.ItemIndicator>
                              </Combobox.Item>
                            )}
                          </Combobox.List>
                        </Combobox.Popup>
                      </Combobox.Positioner>
                    </Combobox.Portal>
                  </Combobox.Root>
                  {inspection && regionChoice === inspection.regionId && !selectedRegion && (
                    <p role="status" className="text-sm text-muted-foreground">Choose an active region for this inspection.</p>
                  )}
                  {uploaded.length > 0 && (
                    <p className="text-xs text-muted-foreground">Remove new uploads before changing region.</p>
                  )}
                </>
              ) : (
                <Input id="inspection-region" readOnly value={selectedRegion ? regionLabel(selectedRegion) : ""} />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={form.district}
                onChange={(e) =>
                  updateField("district", e.target.value)
                }
                placeholder="Nilphamari"
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
                placeholder="Saidpur"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Breeding Site Type</Label>

              <Select
                value={form.breedingSiteType}
                onValueChange={(value) =>
                  updateField("breedingSiteType", value ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {breedingSiteTypes.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={form.latitude}
                onChange={(e) =>
                  updateField("latitude", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={form.longitude}
                onChange={(e) =>
                  updateField("longitude", e.target.value)
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

          <div className="space-y-2">
            <Label htmlFor="inspectedAt">Inspection Date</Label>
            <Input
              id="inspectedAt"
              type="datetime-local"
              value={form.inspectedAt}
              onChange={(e) =>
                updateField("inspectedAt", e.target.value)
              }
              required
            />
          </div>

          <InspectionImageUploads region={selectedRegion?.id ?? ""} saved={[...savedImages, ...form.images.split("\n").filter((value) => value.trim())]}
            onChange={setUploaded} onBusyChange={setUploadsBusy} />
          {savedImages.map((url, index) => (
            <div key={url} className="flex items-center justify-between gap-2">
              <a href={url} target="_blank" rel="noreferrer" className="text-sm underline">View attached image {index + 1}</a>
              <Button type="button" variant="outline" onClick={() => setSavedImages((items) => items.filter((item) => item !== url))}>Remove</Button>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="images">Image URLs</Label>
            <Textarea
              id="images"
              value={form.images}
              onChange={(e) =>
                updateField("images", e.target.value)
              }
              placeholder="Enter one image URL per line"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Inspection Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                updateField("notes", e.target.value)
              }
              placeholder="Additional observations..."
              rows={4}
              maxLength={2000}
            />
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

            <Button type="submit" disabled={loading || uploadsBusy || !selectedRegion}>
              {loading && (
                <Loader2 className="size-4 motion-safe:animate-spin" />
              )}
              {inspection ? "Save Changes" : "Create Inspection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}