"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlatformPageShell({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 sm:space-y-8", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Platform</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function PlatformSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3 border-border p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function PlatformPlaceholderList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-muted-bg/40 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
