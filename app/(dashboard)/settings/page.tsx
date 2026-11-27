import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getPersonalSettings, getSystemSettings } from "@/lib/settings";
import { SettingsForms } from "@/components/dashboard/account/AccountForms";

export default async function SettingsPage() {
  const { user } = await requirePermission("dashboard:view");
  const [personal, system] = await Promise.all([
    getPersonalSettings(user.id),
    user.role === "admin" ? getSystemSettings() : undefined,
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Link href="/profile" className="text-sm text-primary underline">Manage profile and password</Link>
      <SettingsForms personal={personal} system={system} />
      {system && (
        <Card>
          <CardHeader><CardTitle>System information</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Environment · {process.env.NODE_ENV}</p>
            <p>Surveillance time zone · Asia/Dhaka</p>
            <p>Storage · MongoDB</p>
            <p>Image upload and AI inference · Unavailable</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
