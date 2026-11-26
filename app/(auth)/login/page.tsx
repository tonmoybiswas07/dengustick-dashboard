import { ScanEye, ShieldCheck, University } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-teal-600 p-3">
            <ScanEye size={28} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              DengueVision
            </h2>

            <p className="text-xs text-slate-400">
              Surveillance Platform
            </p>
          </div>
        </div>

        <div className="relative max-w-xl space-y-6">
          <div className="flex size-24 items-center justify-center rounded-3xl border border-teal-500/20 bg-teal-500/10 text-teal-400">
            <ShieldCheck size={48} />
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Intelligent Surveillance.
            <span className="block text-teal-400">
              Healthier Communities.
            </span>
          </h1>

          <p className="text-lg leading-relaxed text-slate-400">
            AI-powered vision-based mosquito larvae detection
            and surveillance for smarter field operations
            and public health research.
          </p>
        </div>

        <div className="relative flex items-center gap-4 border-t border-slate-800 pt-6">
          <University className="text-teal-400" size={32} />

          <div>
            <p className="text-sm font-medium">
              Bangladesh Army University of Science and Technology
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Research Project · ZRF-26-251C02
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background p-6 md:p-12">
        <LoginForm />
      </section>
    </main>
  );
}