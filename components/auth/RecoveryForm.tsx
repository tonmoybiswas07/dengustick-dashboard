"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RecoveryForm({ reset }: { reset: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (reset && fields.get("password") !== fields.get("confirmation")) {
      setMessage("The passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/account/recovery", {
        method: reset ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset
          ? { token, newPassword: fields.get("password") }
          : { email: fields.get("email") }),
      });
      const result = await response.json();
      setMessage(result.message ?? (response.ok && reset
        ? "Password changed. Sign in again with your new password." : "The request could not be completed."));
      if (reset && response.ok) {
        form.reset();
        window.history.replaceState(null, "", "/reset-password");
      }
    } catch {
      setMessage("The request could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy} className="space-y-4">
      {reset ? <>
        <label className="block">New password<Input className="mt-1 h-11" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
        <label className="block">Confirm password<Input className="mt-1 h-11" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      </> : <label className="block">Email address<Input className="mt-1 h-11" name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      <Button className="min-h-10 w-full" disabled={busy} type="submit">{busy ? "Working…" : reset ? "Reset password" : "Send reset link"}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
