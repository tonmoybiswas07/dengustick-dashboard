export default function DashboardLoading() {
  return (
    <div role="status" className="space-y-5">
      <span className="sr-only">Loading dashboard content</span>
      <div aria-hidden="true" className="h-8 max-w-64 rounded bg-muted motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-60 rounded-xl border bg-card motion-safe:animate-pulse" />
    </div>
  );
}
