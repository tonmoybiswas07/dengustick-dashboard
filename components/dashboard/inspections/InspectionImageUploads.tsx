"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  inspectionImagePath,
  maxInspectionImageBytes,
  maxInspectionImages,
} from "@/lib/inspection-image-reference.mjs";

type Upload = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  state: "uploading" | "ready" | "failed";
  url?: string;
};

export default function InspectionImageUploads({
  region,
  saved,
  onChange,
  onBusyChange,
}: {
  region: string;
  saved: string[];
  onChange: (urls: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [message, setMessage] = useState("");
  const requests = useRef(new Map<string, XMLHttpRequest>());
  const previews = useRef(new Set<string>());
  const regionRef = useRef(region);
  const uploadedUrls = useRef(new Map<string, string>());

  useEffect(() => {
    const controller = new AbortController();
    const active = requests.current;
    const previewsToRelease = previews.current;
    fetch("/api/inspection-images", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(
        async (response) =>
          response.ok && (await response.json()).enabled === true,
      )
      .then(setEnabled)
      .catch(() => {
        if (!controller.signal.aborted) setEnabled(false);
      });
    return () => {
      controller.abort();
      for (const request of active.values()) request.abort();
      for (const preview of previewsToRelease) URL.revokeObjectURL(preview);
    };
  }, []);

  function update(id: string, update: Partial<Upload>) {
    setUploads((current) =>
      current.map((file) => (file.id === id ? { ...file, ...update } : file)),
    );
  }

  function discard(url: string) {
    void fetch(url, { method: "DELETE" }).catch(() => {});
  }

  function upload(item: Upload) {
    const request = new XMLHttpRequest();
    requests.current.set(item.id, request);
    onBusyChange(true);
    update(item.id, { state: "uploading", progress: 0 });
    request.open(
      "POST",
      `/api/inspection-images?region=${encodeURIComponent(region)}`,
    );
    request.responseType = "json";
    request.timeout = 60_000;
    request.setRequestHeader("Content-Type", item.file.type);
    request.setRequestHeader(
      "X-Image-Extension",
      item.file.name.split(".").at(-1)?.toLowerCase() ?? "",
    );
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        update(item.id, {
          progress: Math.round((event.loaded * 100) / event.total),
        });
    };
    request.onload = () => {
      const url: unknown = request.response?.url;
      if (
        request.status === 201 &&
        typeof url === "string" &&
        inspectionImagePath.test(url)
      ) {
        uploadedUrls.current.set(item.id, url);
        onChange([...uploadedUrls.current.values()]);
        update(item.id, { state: "ready", url });
      } else {
        update(item.id, { state: "failed" });
        setMessage(
          request.response?.message ?? "Image upload failed. Try again.",
        );
      }
    };
    request.onerror = request.ontimeout = () => {
      update(item.id, { state: "failed" });
      setMessage("Image upload interrupted. Try again.");
    };
    request.onloadend = () => {
      requests.current.delete(item.id);
      onBusyChange(requests.current.size > 0);
    };
    request.send(item.file);
  }

  function add(files: FileList | null) {
    if (!enabled || !region || !files) return;
    if (region !== regionRef.current && uploads.length) {
      setMessage(
        "Remove the current uploads before uploading to another region.",
      );
      return;
    }
    regionRef.current = region;
    const room = maxInspectionImages - saved.length - uploads.length;
    if (files.length > room)
      setMessage("An inspection can include up to ten images.");
    const items = Array.from(files)
      .slice(0, Math.max(0, room))
      .flatMap((file): Upload[] => {
        if (
          !/\.(jpe?g|png|webp)$/i.test(file.name) ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size < 1 ||
          file.size > maxInspectionImageBytes
        ) {
          setMessage("Use JPEG, PNG, or WebP files no larger than 4 MiB.");
          return [];
        }
        const preview = URL.createObjectURL(file);
        previews.current.add(preview);
        return [
          {
            id: crypto.randomUUID(),
            file,
            preview,
            progress: 0,
            state: "uploading",
          },
        ];
      });
    setUploads((current) => [...current, ...items]);
    for (const item of items) upload(item);
  }

  function remove(item: Upload) {
    requests.current.get(item.id)?.abort();
    if (item.url) {
      discard(item.url);
      uploadedUrls.current.delete(item.id);
      onChange([...uploadedUrls.current.values()]);
    }
    URL.revokeObjectURL(item.preview);
    previews.current.delete(item.preview);
    setUploads((current) => current.filter(({ id }) => id !== item.id));
  }

  return (
    <section className="space-y-3">
      <Label htmlFor="inspection-files">Upload inspection images</Label>
      {enabled === false && (
        <p className="text-sm text-muted-foreground">
          Managed image storage is unavailable. Existing image URLs can still be
          used.
        </p>
      )}
      {enabled === null && (
        <p role="status" className="text-sm text-muted-foreground">
          Checking image storage…
        </p>
      )}
      {enabled && (
        <div
          className="grid gap-2 rounded-md border border-dashed p-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            add(event.dataTransfer.files);
          }}
        >
          <input
            id="inspection-files"
            aria-describedby="inspection-upload-help"
            type="file"
            multiple
            disabled={!region}
            accept=".jpg,.jpeg,.png,.webp"
            className="w-full min-w-0 text-sm file:mr-2 file:rounded-md file:border file:bg-card file:px-3 file:py-2 file:text-foreground"
            onChange={(event) => {
              add(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <p id="inspection-upload-help" className="text-xs text-muted-foreground">
            Drop images here or select files. JPEG, PNG, WebP, up to 4 MiB each.
          </p>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      {uploads.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center gap-3 rounded-md border p-2"
        >
          <Image
            src={item.preview}
            alt={`Preview of ${item.file.name}`}
            width={64}
            height={64}
            unoptimized
            className="size-16 rounded object-cover"
          />
          <div className="min-w-0 flex-1 break-all text-sm">
            <p>{item.file.name}</p>
            {item.state === "uploading" ? (
              <progress
                aria-label={`Uploading ${item.file.name}`}
                max={100}
                value={item.progress}
              />
            ) : (
              <p role="status" className="text-muted-foreground">
                {item.state === "ready" ? "Uploaded" : "Upload failed"}
              </p>
            )}
          </div>
          {item.state === "failed" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => upload(item)}
            >
              Retry
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => remove(item)}>
            {item.state === "uploading" ? "Cancel upload" : "Remove"}
          </Button>
        </div>
      ))}
    </section>
  );
}
