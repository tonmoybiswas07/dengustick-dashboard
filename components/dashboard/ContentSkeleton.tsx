import { Skeleton } from "@/components/ui/skeleton";

export function ContentSkeleton({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="status" className={`space-y-4 rounded-xl border bg-card p-4 sm:p-6 ${className}`}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-5/6" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-3/4" />
      </div>
    </div>
  );
}
