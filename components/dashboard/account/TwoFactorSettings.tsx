"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Secrets = { qr?: string; key?: string; codes?: string[] };

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const [secrets, setSecrets] = useState<Secrets>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter?.getAttribute("value");
    if (!action) return;
    const fields = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/two-factor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action,
          ...(action !== "confirm" && { password: fields.get("password") }),
          ...(action !== "enroll" && { code: fields.get("code") }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Could not update authenticator");
      form.reset();
      if (result.signInAgain) {
        setSecrets(undefined);
        router.replace("/login");
        router.refresh();
      } else {
        setSecrets(result);
        setMessage(action === "enroll" ? "Save your recovery codes before confirming." : "Recovery codes replaced.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authenticator update failed");
    } finally {
      setBusy(false);
    }
  }

  return <Card id="two-factor">
    <CardHeader><CardTitle>Two-factor authentication</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">{enabled ? "Authenticator enabled" : "Authenticator not enabled"}</p>
      {secrets?.qr && <div className="space-y-2 break-all text-sm">
        <Image unoptimized src={secrets.qr} width={220} height={220} alt="Scan with your authenticator app" />
        <p>Manual setup key <code>{secrets.key}</code></p>
      </div>}
      {secrets?.codes && <div className="rounded border p-3 text-sm">
        <p>Store these recovery codes somewhere safe.</p>
        <ul className="mt-2 grid gap-1 font-mono sm:grid-cols-2">{secrets.codes.map((code) => <li key={code}>{code}</li>)}</ul>
      </div>}
      <form className="space-y-3" onSubmit={submit}>
        {(enabled || !secrets?.qr) && <label className="block text-sm">Current password
          <Input name="password" type="password" autoComplete="current-password" maxLength={128} required />
        </label>}
        {(enabled || secrets?.qr) && <label className="block text-sm">Authenticator code
          <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
        </label>}
        <div className="flex flex-wrap gap-2">
          {enabled ? <>
            <Button type="submit" variant="outline" value="regenerate" disabled={busy}>Regenerate recovery codes</Button>
            <Button type="submit" variant="outline" value="disable" disabled={busy}>Disable authenticator</Button>
          </> : <Button type="submit" value={secrets?.qr ? "confirm" : "enroll"} disabled={busy}>
            {secrets?.qr ? "Verify enrollment" : "Set up authenticator"}
          </Button>}
        </div>
      </form>
      {message && <p role="status" className="text-sm">{message}</p>}
    </CardContent>
  </Card>;
}
