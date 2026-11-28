import type { ReactNode } from "react";

export function PageHeader({ title, description, icon }: {
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        {icon && <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/15 bg-primary/8 text-primary [&>svg]:size-5">{icon}</span>}
        <h1 className="min-w-0 wrap-break-word text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      {description && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
