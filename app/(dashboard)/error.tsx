"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-6">
      <h1 className="text-xl font-semibold">Dashboard content unavailable</h1>
      <p role="alert" className="text-sm text-muted-foreground">The page could not be loaded.</p>
      <Button type="button" variant="outline" onClick={retry}>Try again</Button>
    </section>
  );
}
