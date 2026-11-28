"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManagedAvatar({ available }: { available: boolean }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function update(image?: File) {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/account/avatar", image ? {
        method: "POST", headers: { "Content-Type": image.type }, body: image,
      } : { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "Avatar update failed.");
      if (file.current) file.current.value = "";
      setStatus(image ? "Avatar updated." : "Managed avatar removed.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Avatar update failed.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const image = file.current?.files?.[0];
    if (image) void update(image);
  }

  return (
    <form className="flex flex-wrap items-end gap-3 border-t pt-4 text-sm" onSubmit={submit}>
      <label>Profile photo (JPEG, PNG, WebP, up to 512 KiB)
        <Input ref={file} type="file" required accept="image/jpeg,image/png,image/webp" />
      </label>
      <Button type="submit" size="sm" disabled={busy}>Upload avatar</Button>
      {available && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => update()}>Remove managed avatar</Button>}
      {status && <p className="w-full" role="status">{status}</p>}
    </form>
  );
}
