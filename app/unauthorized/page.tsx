import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-12 text-destructive" />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-destructive">
            ERROR 403
          </p>

          <h1 className="text-3xl font-bold">
            Access Denied
          </h1>

          <p className="text-muted-foreground">
            You do not have the required permissions to
            access this resource. Please contact your
            system administrator.
          </p>
        </div>

        <Link href="/dashboard" className={buttonVariants()}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}