import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";
import { ManagedAvatar } from "@/components/dashboard/account/ManagedAvatar";
import { profileAvatars } from "@/lib/profile-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ObjectId } from "mongodb";
import { requirePermission } from "@/lib/session";
import { regionsCollection } from "@/lib/collections";
import { profileSchema } from "@/lib/validations/account";
import { ProfileForms } from "@/components/dashboard/account/AccountForms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const { user } = await requirePermission("dashboard:view");
  const region = user.regionId && ObjectId.isValid(user.regionId)
    ? await regionsCollection.findOne({ _id: new ObjectId(user.regionId) }, { projection: { name: 1 } })
    : null;
  const managed = await profileAvatars.findOne({ _id: user.id }, { projection: { _id: 1 } });
  const image = profileSchema.shape.image.safeParse(user.image ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Profile" description="Manage your personal information, avatar, and password." />
      <Card>
        <CardHeader><CardTitle>{user.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Avatar className="size-20">
            {managed ? <AvatarImage src="/api/account/avatar" alt="" /> : image.success && image.data && <AvatarImage src={image.data} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Email</dt><dd className="break-all">{user.email}</dd></div>
            <div><dt className="text-muted-foreground">Email status</dt><dd>{user.emailVerified ? "Verified" : "Unverified"}</dd></div>
            <div><dt className="text-muted-foreground">Role</dt><dd className="capitalize">{user.role?.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-muted-foreground">Assigned region</dt><dd>{region?.name ?? (user.role === "admin" ? "All regions" : "Unassigned")}</dd></div>
            <div><dt className="text-muted-foreground">Account created</dt><dd>{new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Asia/Dhaka" }).format(user.createdAt)}</dd></div>
          </dl>
          <ManagedAvatar available={!!managed} />
        </CardContent>
      </Card>
      <Link href="/settings#two-factor" className="text-sm text-primary underline">Manage two-factor authentication</Link>
      <ProfileForms name={user.name} image={image.success ? image.data : null} />
    </div>
  );
}
