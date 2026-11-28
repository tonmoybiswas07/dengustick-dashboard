import Link from "next/link";
import { connection } from "next/server";
import { RecoveryForm } from "@/components/auth/RecoveryForm";
import { getRecoveryMailer } from "@/lib/recovery-mail";

export default async function RecoveryPage() {
  await connection();
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-5">
      <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Request a password reset</h1>
        {getRecoveryMailer() ? <RecoveryForm reset={false} /> : <p>Password recovery is unavailable. Contact your administrator.</p>}
        <Link href="/login" className="text-sm text-primary underline">Back to sign in</Link>
      </section>
    </main>
  );
}
