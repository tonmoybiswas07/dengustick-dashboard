import { TwoFactorSettings } from "@/components/dashboard/account/TwoFactorSettings";
import { predictionConfigured } from "@/lib/inspection-predictions";
import { ImageCleanupButton } from "@/components/dashboard/account/ImageCleanupButton";
import { getImageStorage } from "@/lib/cloudinary-images";
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
  const storageConfigured = user.role === "admin" && !!getImageStorage();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Link href="/profile" className="text-sm text-primary underline">Manage profile and password</Link>
      <SettingsForms personal={personal} system={system} />
      <TwoFactorSettings enabled={"twoFactorEnabled" in user && user.twoFactorEnabled === true} />
      {system && (
        <Card>
          <CardHeader><CardTitle>System information</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Environment · {process.env.NODE_ENV}</p>
            <p>Surveillance time zone · Asia/Dhaka</p>
            <p>Storage · MongoDB</p>
            <p>Managed image storage · {storageConfigured ? "Configured" : "Unavailable"}</p>
            <p>AI dispatch · {predictionConfigured() ? "Configured" : "Unavailable"}</p>
            {storageConfigured && <ImageCleanupButton />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
