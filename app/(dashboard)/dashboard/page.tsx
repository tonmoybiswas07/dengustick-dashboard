import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <LayoutDashboard size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Surveillance Overview
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Monitor mosquito breeding sites, inspections and
              AI detection activity.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8">
        <h2 className="text-lg font-semibold">
          Welcome to DengueVision
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Your surveillance dashboard is ready for development.
        </p>
      </div>
    </section>
  );
}