"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const labels: Record<string, string> = {
  "task.assign": "Task assigned",
  "task.status": "Task status updated",
  "alert.resolve": "Alert resolved",
};

type Event = { id: string; action: string; timestamp: string; status?: string; actor?: string };

export default function ActivityHistory({ kind, id }: { kind: "task" | "alert"; id: string }) {
  const [events, setEvents] = useState<Event[]>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  async function toggle() {
    setOpen(!open);
    if (open) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/activity/${kind}/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setEvents((await response.json()).events);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return <div className="text-sm">
    <Button type="button" size="sm" variant="ghost" onClick={toggle} disabled={loading} aria-expanded={open}>
      {open ? "Hide activity" : "Show activity"}
    </Button>
    {open && <div className="mt-2 text-muted-foreground">
      {loading ? <p role="status">Loading activity…</p> : failed ? <p role="alert">Activity history is unavailable.</p> :
        events?.length ? <ol className="space-y-1">
          {events.map((event) => <li key={event.id}>
            {labels[event.action]}{event.actor && ` · ${event.actor}`}{event.status && ` · ${event.status.replaceAll("_", " ")}`}
            <time className="block text-xs" dateTime={event.timestamp}>
              {new Date(event.timestamp).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
            </time>
          </li>)}
        </ol> : <p>No recorded activity.</p>}
    </div>}
  </div>;
}
