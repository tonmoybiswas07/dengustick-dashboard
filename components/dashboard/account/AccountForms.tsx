"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PersonalSettings, SystemSettings } from "@/lib/validations/account";

async function request(path: string, method = "GET", body?: object) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "Request failed");
  return result;
}

function AccountForm({ title, children, save, method = "PATCH", path }: {
  title: string;
  children: ReactNode;
  save: (data: FormData) => object;
  method?: "PATCH" | "POST";
  path: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const payload = save(new FormData(form));
      if (Object.keys(payload).length === 0) return;
      await request(path, method, payload);
      if (method === "POST") form.reset();
      toast.success(method === "POST" ? "Password changed and other sessions signed out" : "Changes saved");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            {children}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit">{busy ? "Saving…" : "Save changes"}</Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfileForms({ name, image }: { name: string; image: string | null }) {
  return (
    <>
      <AccountForm title="Edit profile" path="/api/account" save={(data) => ({
        name: data.get("name"), image: String(data.get("image")).trim() || null,
      })}>
        <label className="block space-y-1 text-sm">Full name
          <Input name="name" autoComplete="name" required minLength={3} maxLength={100} defaultValue={name} />
        </label>
        <label className="block space-y-1 text-sm">Avatar URL
          <Input name="image" type="url" maxLength={2048} defaultValue={image ?? ""} placeholder="https://" />
        </label>
      </AccountForm>
      <AccountForm title="Change password" path="/api/account/password" method="POST" save={(data) => ({
        currentPassword: data.get("current"), newPassword: data.get("password"), confirmation: data.get("confirmation"),
      })}>
        <label className="block space-y-1 text-sm">Current password
          <Input name="current" type="password" autoComplete="current-password" required maxLength={128} />
        </label>
        <label className="block space-y-1 text-sm">New password
          <Input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        </label>
        <label className="block space-y-1 text-sm">Confirm new password
          <Input name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        </label>
      </AccountForm>
    </>
  );
}

const selectClass = "ml-2 rounded-md border bg-background px-3 py-2";

export function SettingsForms({ personal, system }: { personal: PersonalSettings; system?: SystemSettings }) {
  return (
    <>
      <AccountForm key={JSON.stringify(personal)} title="Personal preferences" path="/api/account/settings" save={(data) => ({
        ...(data.get("theme") !== personal.theme && { theme: data.get("theme") }),
        ...(data.has("alertNotifications") !== personal.alertNotifications && { alertNotifications: data.has("alertNotifications") }),
      })}>
        <label className="block text-sm">Theme
          <select name="theme" className={selectClass} defaultValue={personal.theme}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
          </select>
        </label>
        <label className="flex gap-2 text-sm">
          <input name="alertNotifications" type="checkbox" defaultChecked={personal.alertNotifications} />
          Show in-app alert notifications
        </label>
      </AccountForm>
      <Sessions />
      {system && (
        <AccountForm key={JSON.stringify(system)} title="System configuration" path="/api/administration/settings" save={(data) => ({
          ...(data.get("dashboardRange") !== system.dashboardRange && { dashboardRange: data.get("dashboardRange") }),
          ...(data.has("positiveDetectionAlerts") !== system.positiveDetectionAlerts && { positiveDetectionAlerts: data.has("positiveDetectionAlerts") }),
          ...(data.has("overdueTaskAlerts") !== system.overdueTaskAlerts && { overdueTaskAlerts: data.has("overdueTaskAlerts") }),
        })}>
          <label className="block text-sm">Default dashboard range
            <select name="dashboardRange" className={selectClass} defaultValue={system.dashboardRange}>
              <option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option>
            </select>
          </label>
          <label className="flex gap-2 text-sm">
            <input name="positiveDetectionAlerts" type="checkbox" defaultChecked={system.positiveDetectionAlerts} />
            Generate alerts for verified positive inspections
          </label>
          <label className="flex gap-2 text-sm">
            <input name="overdueTaskAlerts" type="checkbox" defaultChecked={system.overdueTaskAlerts} />
            Generate alerts for overdue tasks
          </label>
          <p className="text-sm text-muted-foreground">Email notifications and multi-factor authentication are unavailable.</p>
        </AccountForm>
      )}
    </>
  );
}

type Session = { id: string; userAgent?: string; expiresAt: string; current: boolean };

function Sessions() {
  const [sessions, setSessions] = useState<Session[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(revoke: boolean) {
    setBusy(true);
    setError("");
    try {
      if (revoke) {
        await request("/api/account/sessions", "POST");
        toast.success("Other sessions signed out");
        setSessions(undefined);
      }
      const result = await request("/api/account/sessions");
      setSessions(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to manage sessions");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => load(false)}>{busy ? "Working…" : "View active sessions"}</Button>
          <Button variant="outline" disabled={busy} onClick={() => load(true)}>Sign out other sessions</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {sessions?.length === 0 && <p>No active sessions found.</p>}
        {sessions?.map((session) => (
          <div key={session.id} className="break-all rounded-md border p-3 text-sm">
            <p>{session.current ? "Current session" : "Other session"}</p>
            <p className="text-muted-foreground">{session.userAgent || "Unknown device"}</p>
            <p>Expires {new Date(session.expiresAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
