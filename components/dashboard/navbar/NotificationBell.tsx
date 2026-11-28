"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<{ _id: string; title: string; severity: string; sourceId: string; sourceType: string }[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch("/api/alerts?status=unread&inbox=1", { signal: controller.signal })
      .then(async (result) => {
        if (!result.ok) throw new Error();
        const { data } = await result.json();
        if (!controller.signal.aborted) setAlerts(data);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load notifications."); });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    const lifetime = new AbortController();
    let pending: AbortController | undefined;
    async function refresh(event?: Event) {
      if (document.visibilityState === "hidden" || (pending && event?.type !== "alerts-updated")) return;
      pending?.abort();
      const request = new AbortController();
      pending = request;
      try {
        const response = await fetch("/api/alerts/count", {
          signal: AbortSignal.any([lifetime.signal, request.signal]),
        });
        if (!response.ok) return;
        const { count } = await response.json();
        if (!request.signal.aborted && !lifetime.signal.aborted) setCount(count);
      } catch {
        // Keep the last known count until the next successful refresh.
      } finally {
        if (pending === request) pending = undefined;
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("alerts-updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      lifetime.abort();
      window.clearInterval(timer);
      window.removeEventListener("alerts-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function markVisible() {
    if (!alerts?.length) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/alerts/read", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: alerts.map((alert) => alert._id) }),
      });
      if (!response.ok) throw new Error();
      setAlerts([]);
      window.dispatchEvent(new Event("alerts-updated"));
    } catch {
      setError("Could not mark notifications as read.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) { setAlerts(undefined); setError(""); } }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="relative size-10" aria-label={`Notifications, ${count} unread`} />}>
        <Bell className="size-5" />
        {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">{count > 99 ? "99+" : count}</span>}
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto">
        <DialogTitle>Notifications</DialogTitle>
        <DialogDescription>Recent unread alerts</DialogDescription>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!alerts && !error && <p role="status">Loading notifications…</p>}
        {alerts?.length === 0 && <p role="status">No visible unread notifications.</p>}
        <ul className="space-y-2">
          {alerts?.map((alert) => <li key={alert._id} className="rounded border p-2 text-sm">
            <Link onClick={() => setOpen(false)} className="underline" href={alert.sourceType === "inspection" ? `/inspections/${alert.sourceId}` : "/field-operations"}>
              {alert.title}
            </Link>
            <p className="capitalize text-muted-foreground">{alert.severity} severity</p>
          </li>)}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          {!!alerts?.length && <Button disabled={busy} variant="outline" onClick={markVisible}>Mark all visible as read</Button>}
          <Link href="/alerts" onClick={() => setOpen(false)} className="text-sm underline">View all alerts</Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
