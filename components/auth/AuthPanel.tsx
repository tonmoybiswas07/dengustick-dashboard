import type { ReactNode } from "react";
import { ScanEye } from "lucide-react";

export function AuthPanel({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 sm:p-8">
      <section className="w-full max-w-md space-y-5 rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-2 border-b pb-4 text-sm font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ScanEye aria-hidden="true" size={18} /></span>
          DengueStick
        </div>
        {children}
      </section>
    </main>
  );
}
