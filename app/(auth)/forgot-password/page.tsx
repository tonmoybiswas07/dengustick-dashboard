import { AuthPanel } from "@/components/auth/AuthPanel";
import Link from "next/link";
import { connection } from "next/server";
import { RecoveryForm } from "@/components/auth/RecoveryForm";
import { getRecoveryMailer } from "@/lib/recovery-mail";

export default async function RecoveryPage() {
  await connection();
  return (
    <AuthPanel>
      <h1 className="text-2xl font-semibold">Request a password reset</h1>
      {getRecoveryMailer() ? <RecoveryForm reset={false} /> : <p>Password recovery is unavailable. Contact your administrator.</p>}
      <Link href="/login" className="text-sm text-primary underline">Back to sign in</Link>
    </AuthPanel>
  );
}
