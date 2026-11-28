"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Schedule = { _id: string; title: string; frequency: string; enabled: boolean; nextRunAt: string };

export function ReportSchedules() {
  const [data, setData] = useState<{ configured: boolean; data: Schedule[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reports/schedules", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error();
      setData(await response.json());
    }).catch(() => { if (!controller.signal.aborted) setError("Schedules could not be loaded."); });
    return () => controller.abort();
  }, [refresh]);

  async function save(method: "POST" | "PATCH", body: object) {
    setBusy(true);
    setError("");
    try {
      const result = await fetch("/api/reports/schedules", {
        method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
      });
      if (!result.ok) throw new Error((await result.json().catch(() => null))?.message ?? "Could not save the schedule.");
      setRefresh((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the schedule.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save("POST", { title: form.get("title"), frequency: form.get("frequency") });
  }

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">Scheduled surveillance reports</h2>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!data && !error && <p role="status" className="text-sm">Loading schedules…</p>}
      {data?.configured === false && <p className="text-muted-foreground text-sm">Report scheduling is unavailable.</p>}
      {data?.configured && <>
        <form className="flex flex-wrap items-end gap-3 text-sm" onSubmit={submit}>
          <label>Title <Input name="title" required minLength={3} maxLength={100} /></label>
          <label>Frequency <select name="frequency" className="block rounded border bg-background p-2">
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select></label>
          <Button disabled={busy} type="submit">Add schedule</Button>
        </form>
        {!data.data.length && <p className="text-sm text-muted-foreground">No report schedules.</p>}
        <ul className="space-y-2">{data.data.map((item) => (
          <li className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm" key={item._id}>
            <span className="break-words">{item.title} · {item.frequency} · {item.enabled
              ? new Date(item.nextRunAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }) : "Paused"}</span>
            <Button disabled={busy} size="sm" variant="outline" onClick={() => save("PATCH", { id: item._id, enabled: !item.enabled })}>
              {item.enabled ? "Pause" : "Resume"}
            </Button>
          </li>
        ))}</ul>
      </>}
    </section>
  );
}
